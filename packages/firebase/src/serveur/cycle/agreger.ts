import { minuitParis } from '@ph/core/admin';
import { agregerJourCycle } from '@ph/core/conversion';
import { ETAPES_CYCLE } from '@ph/core/schemas';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';

/**
 * `cycleAgreger` (chaque nuit) : `cycleStats/{jour}` pour la vue d'ensemble — entonnoir, envois,
 * ouvertures, clics, conversions et revenu attribué par modèle, groupe témoin (CONVERSION §8).
 * Comptages et lectures limités au jour : aucune relecture de tout l'historique.
 */
export async function agregerCycleJour(db: Firestore, jour: string): Promise<void> {
  const debut = Timestamp.fromMillis(minuitParis(jour));
  const lendemain = new Date(Date.parse(`${jour}T12:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);
  const fin = Timestamp.fromMillis(minuitParis(lendemain));
  const etats = db.collection(collections.cycleEtat);
  const traces = (type: string) =>
    db
      .collection(collections.cycleTraces)
      .where('type', '==', type)
      .where('createdAt', '>=', debut)
      .where('createdAt', '<', fin)
      .get();
  const emails = (champ: 'ouvertLe' | 'cliqueLe') =>
    db.collection(collections.emails).where(champ, '>=', debut).where(champ, '<', fin).get();
  const [parEtape, envois, conversions, ouvertures, clics, temoin] = await Promise.all([
    Promise.all(
      ETAPES_CYCLE.map(
        async (e) => [e, (await etats.where('etape', '==', e).count().get()).data().count] as const,
      ),
    ),
    traces('email_planifie'),
    traces('conversion'),
    emails('ouvertLe'),
    emails('cliqueLe'),
    etats.where('groupeTemoin', '==', true).count().get(),
  ]);
  const offresPro = (r: FirebaseFirestore.QuerySnapshot) =>
    r.docs.filter((d) => d.get('categorie') === 'offres_pro').map((d) => d.get('modele') as string);
  const stats = agregerJourCycle({
    parEtape: Object.fromEntries(parEtape),
    envois: envois.docs.map((d) => d.get('modele') as string),
    ouvertures: offresPro(ouvertures),
    clics: offresPro(clics),
    conversions: conversions.docs.map((d) => ({
      modele: (d.get('modele') as string | undefined) ?? null,
      montantHtCentimes: (d.get('details.montantHtCentimes') as number | undefined) ?? 0,
      temoin: d.get('details.temoin') === true,
    })),
    temoinEffectif: temoin.data().count,
  });
  await db
    .collection(collections.cycleStats)
    .doc(jour)
    .set({ schemaVersion: 1, jour, ...stats });
}
