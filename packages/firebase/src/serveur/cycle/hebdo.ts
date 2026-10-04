import { demandesManquees, type DemandeExclusive } from '@ph/core/conversion';
import { formatDate } from '@ph/core/format';
import { Timestamp, type DocumentSnapshot } from 'firebase-admin/firestore';
import { chemins, collections, GROUPE_ATTRIBUTIONS } from '../../chemins';
import { lireConfigCycle, tenterEnvoi, type ServicesCycle } from './moteur';

const J = 86_400_000;
const MIN_DEMANDES = 2;

/**
 * `cycleHebdo` (lundi 7 h) : `prem-demandes-manquees` aux entreprises Visibilité (S6) et aux
 * gratuites visées par Premium (S5) dont le métier et la zone ont vu partir au moins 2 demandes
 * en exclusivité chez un Premium la semaine passée (CONVERSION §3).
 */
export async function envoyerDemandesManquees(
  s: ServicesCycle,
): Promise<{ demandes: number; planifies: number }> {
  const maintenant = s.horloge();
  const debut = maintenant - 7 * J;
  const attributions = await s.db
    .collectionGroup(GROUPE_ATTRIBUTIONS)
    .where('exclusive', '==', true)
    .where('proposeeLe', '>=', Timestamp.fromMillis(debut))
    .where('proposeeLe', '<', Timestamp.fromMillis(maintenant))
    .get();
  if (attributions.empty) return { demandes: 0, planifies: 0 };
  const docs = await s.db.getAll(
    ...attributions.docs.map((a) => s.db.doc(chemins.demande(a.get('demandeId') as string))),
  );
  const noms = new Map<string, string>();
  const demandes: DemandeExclusive[] = [];
  for (const [i, d] of docs.entries()) {
    if (!d.exists || !d.get('metierRequis') || !d.get('adresseChantier.geo')) continue;
    const prestation = d.get('prestationId') as string;
    if (!noms.has(prestation))
      noms.set(
        prestation,
        ((await s.db.doc(chemins.prestationItem(prestation)).get()).get('nom') as
          string | undefined) ?? 'Travaux',
      );
    demandes.push({
      id: d.id,
      metier: d.get('metierRequis') as string,
      geo: d.get('adresseChantier.geo') as DemandeExclusive['geo'],
      artisanId: attributions.docs[i]!.get('artisanId') as string,
      travaux: noms.get(prestation)!,
      ville: d.get('adresseChantier.ville') as string,
      budgetCentimes: Math.round(
        ((d.get('estimation.minCentimes') as number) +
          (d.get('estimation.maxCentimes') as number)) /
          2,
      ),
    });
  }
  const config = await lireConfigCycle(s.db);
  const etats = await s.db
    .collection(collections.cycleEtat)
    .where('etape', 'in', ['gratuit_actif', 'visibilite'])
    .get();
  const cibles = etats.docs.filter(
    (e) =>
      e.get('etape') === 'visibilite' ||
      (e.get('etape') === 'gratuit_actif' && e.get('offreCible') === 'premium'),
  );
  const semaine = `Semaine du ${formatDate(debut, 'long')} au ${formatDate(maintenant - J, 'long')}`;
  let planifies = 0;
  for (let i = 0; i < cibles.length; i += 100) {
    const tranche = cibles.slice(i, i + 100);
    const artisans = await s.db.getAll(...tranche.map((e) => s.db.doc(chemins.artisan(e.id))));
    for (const [k, a] of artisans.entries()) {
      const etat = tranche[k]!;
      const zone = a.get('zoneIntervention') as
        { centre: DemandeExclusive['geo']; rayonKm: number } | undefined;
      if (!zone || etat.get('pause') || etat.get('exclu') === true) continue;
      const manquees = demandesManquees(
        a.id,
        { metiers: (a.get('metiers') as string[] | undefined) ?? [], ...zone },
        demandes,
      );
      if (manquees.length < MIN_DEMANDES) continue;
      const issue = await tenterEnvoi(s, config, etat as DocumentSnapshot, {
        modele: 'prem-demandes-manquees',
        refObjet: `cycle/${a.id}/demandes-manquees/${new Date(maintenant).toISOString().slice(0, 10)}`,
        type: 'signal',
        extra: {
          semaine,
          demandes: manquees.map(({ travaux, ville, budgetCentimes }) => ({
            travaux,
            ville,
            budgetCentimes,
          })),
        },
      });
      if (issue === 'planifie') planifies++;
    }
  }
  return { demandes: demandes.length, planifies };
}
