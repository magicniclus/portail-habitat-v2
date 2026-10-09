import {
  DEMANDE_OFFERTE,
  demandeOffrable,
  destinatairesDemandeOfferte,
  type CandidatOffre,
} from '@ph/core/conversion';
import { libelleDelai } from '@ph/core/demandes';
import { ErreurMetier } from '@ph/core/erreurs';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { debloquerAppelOffres } from '../matching/deblocage';
import {
  lireConfigCycle,
  tenterEnvoi,
  tracer,
  URL_SITE_DEFAUT,
  type ServicesCycle,
} from './moteur';

/**
 * Demandes invendues offertes (CONVERSION §3 bis, D31e, CONV-07) : un appel d'offres sans
 * déblocage après 24 h est proposé à 5 artisans Gratuit du secteur ; les 3 premiers qui activent
 * Visibilité le reçoivent débloqué ; une entreprise n'en bénéficie qu'une fois.
 */

const H = 3_600_000;
const ms = (t: unknown) => (t as Timestamp).toMillis();

/** `cycleDemandesInvendues` (chaque heure). */
export async function offrirDemandesInvendues(
  s: ServicesCycle,
): Promise<{ demandes: number; offres: number }> {
  const maintenant = s.horloge();
  const aos = await s.db
    .collection(collections.appelsOffres)
    .where('statut', '==', 'ouvert')
    .where('nbDeblocages', '==', 0)
    .where('ouvertLe', '<=', Timestamp.fromMillis(maintenant - DEMANDE_OFFERTE.apresH * H))
    .limit(50)
    .get();
  const config = await lireConfigCycle(s.db);
  let demandes = 0;
  let offres = 0;
  for (const ao of aos.docs) {
    if (ao.get('offerteLe')) continue;
    const d = await s.db.doc(chemins.demande(ao.get('demandeId') as string)).get();
    const metier = d.get('metierRequis') as string | undefined;
    const geo = d.get('adresseChantier.geo') as CandidatOffre['centre'] | undefined;
    if (
      !d.exists ||
      !metier ||
      !geo ||
      !demandeOffrable(
        { ouvertLe: ms(ao.get('ouvertLe')), creeeLe: ms(d.get('createdAt')), nbDeblocages: 0 },
        maintenant,
      )
    )
      continue;
    const artisans = (
      await s.db
        .collection(collections.artisans)
        .where('metiers', 'array-contains', metier)
        .where('plan', '==', 'gratuit')
        .get()
    ).docs.filter(
      (a) =>
        a.get('statut') === 'actif' &&
        a.get('enLigne') === true &&
        a.get('optionVisibilite') !== true &&
        a.get('zoneIntervention.centre'),
    );
    if (!artisans.length) continue;
    const etats = await s.db.getAll(
      ...artisans.map((a) => s.db.collection(collections.cycleEtat).doc(a.id)),
    );
    const candidats: CandidatOffre[] = artisans.map((a, i) => {
      const e = etats[i]!;
      const enCours = e.get('demandeOfferte.jusqua') as Timestamp | undefined;
      return {
        id: a.id,
        score: (e.get('score') as number | undefined) ?? 0,
        metiers: a.get('metiers') as string[],
        centre: a.get('zoneIntervention.centre') as CandidatOffre['centre'],
        rayonKm: (a.get('zoneIntervention.rayonKm') as number | undefined) ?? 0,
        dejaBeneficiaire:
          e.get('demandeOfferteRecue') === true ||
          (enCours !== undefined && enCours.toMillis() > maintenant),
        temoin: !e.exists || e.get('groupeTemoin') === true || e.get('exclu') === true,
      };
    });
    const choisis = destinatairesDemandeOfferte({ metier, geo }, candidats);
    if (!choisis.length) continue;
    demandes++;
    const travaux =
      ((await s.db.doc(chemins.prestationItem(d.get('prestationId') as string)).get()).get(
        'nom',
      ) as string | undefined) ?? 'Travaux';
    const retenus: string[] = [];
    for (const c of choisis) {
      const etat = etats[artisans.findIndex((a) => a.id === c.id)]!;
      const issue = await tenterEnvoi(s, config, etat, {
        modele: 'vis-demande-offerte',
        refObjet: `cycle/${c.id}/demande-offerte/${ao.id}`,
        type: 'signal',
        extra: {
          travaux,
          budgetMinCentimes: d.get('estimation.minCentimes') as number,
          budgetMaxCentimes: d.get('estimation.maxCentimes') as number,
          distanceKm: Math.max(1, c.distanceKm),
          delai: libelleDelai(d.get('delaiSouhaite') as string),
        },
        surcharge: {
          ville: d.get('adresseChantier.ville') as string,
          lien: `${s.urlSite ?? URL_SITE_DEFAUT}/pro/abonnement/visibilite?facturation=annuel`,
        },
      });
      if (issue !== 'planifie') continue;
      retenus.push(c.id);
      await etat.ref.update({
        demandeOfferte: {
          appelOffresId: ao.id,
          le: Timestamp.fromMillis(maintenant),
          jusqua: Timestamp.fromMillis(maintenant + DEMANDE_OFFERTE.attenteH * H),
        },
      });
      await tracer(s.db, maintenant, {
        artisanId: c.id,
        type: 'demande_offerte',
        fonction: 'cycleDemandesInvendues',
        details: { appelOffresId: ao.id },
      });
    }
    offres += retenus.length;
    await ao.ref.update({
      offerteLe: Timestamp.fromMillis(maintenant),
      offerteA: retenus,
      updatedAt: Timestamp.fromMillis(maintenant),
    });
  }
  return { demandes, offres };
}

/**
 * Visibilité activée (webhook Stripe) : la demande offerte est débloquée gratuitement si l'offre
 * court encore et qu'il reste une place ; sinon l'entreprise recevra la prochaine.
 */
export async function attribuerDemandeOfferte(
  s: { db: Firestore; horloge: () => number },
  artisanId: string,
): Promise<'debloquee' | 'complet' | null> {
  const maintenant = s.horloge();
  const ref = s.db.collection(collections.cycleEtat).doc(artisanId);
  const etat = await ref.get();
  const offre = etat.get('demandeOfferte') as
    { appelOffresId: string; jusqua: Timestamp } | undefined;
  if (!offre || etat.get('demandeOfferteRecue') === true || offre.jusqua.toMillis() < maintenant)
    return null;
  const artisan = await s.db.doc(chemins.artisan(artisanId)).get();
  if (artisan.get('optionVisibilite') !== true && artisan.get('plan') !== 'premium') return null;
  try {
    const r = await debloquerAppelOffres(s, {
      appelOffresId: offre.appelOffresId,
      artisanId,
      uid: artisan.get('proprietaireUid') as string,
      choix: 'auto',
      offerte: true,
    });
    if (r.etat === 'paiement_requis') return null;
  } catch (err) {
    if (!(err instanceof ErreurMetier) || err.code !== 'CONFLIT') throw err;
    await ref.update({ demandeOfferte: FieldValue.delete() });
    return 'complet';
  }
  await ref.update({ demandeOfferteRecue: true, demandeOfferte: FieldValue.delete() });
  await tracer(s.db, maintenant, {
    artisanId,
    type: 'demande_offerte_convertie',
    fonction: 'cycleOnAbonnement',
    details: { appelOffresId: offre.appelOffresId },
  });
  return 'debloquee';
}
