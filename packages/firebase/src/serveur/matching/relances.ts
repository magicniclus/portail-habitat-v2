import { Timestamp } from 'firebase-admin/firestore';
import { collections, GROUPE_ATTRIBUTIONS } from '../../chemins';
import { convertirEnAppelOffres, type ServicesMatching } from './attribuer';

/**
 * `matchingRelance` (MATCHING [7], toutes les 15 minutes) : propositions expirées, demandes
 * garanties non acceptées converties en appel d'offres (D41), appels d'offres sans preneur
 * signalés à l'admin après 48 h, appels d'offres échus clos.
 */
const LOT = 200;
const SANS_PRENEUR_MS = 48 * 3_600_000;
const FENETRE_REFUS_MS = 60 * 60_000;

export interface BilanRelance {
  expirees: number;
  converties: number;
  sansPreneur: number;
  clos: number;
}

export async function relancerMatching(s: ServicesMatching): Promise<BilanRelance> {
  const maintenant = s.horloge();
  const t = Timestamp.fromMillis(maintenant);
  const attributions = s.db.collectionGroup(GROUPE_ATTRIBUTIONS);

  // 1. Propositions sans réponse dans le délai : expirées.
  const echues = await attributions
    .where('statut', 'in', ['proposee', 'vue'])
    .where('expireLe', '<=', t)
    .limit(LOT)
    .get();
  const lot = s.db.batch();
  for (const a of echues.docs) lot.update(a.ref, { statut: 'expiree' });
  if (!echues.empty) await lot.commit();

  // 2. Demandes garanties expirées ou refusées récemment : appel d'offres.
  const refusees = await attributions
    .where('statut', '==', 'refusee')
    .where('reponduLe', '>=', Timestamp.fromMillis(maintenant - FENETRE_REFUS_MS))
    .limit(LOT)
    .get();
  const demandes = new Set(
    [...echues.docs, ...refusees.docs]
      .filter((a) => a.get('exclusive') === true)
      .map((a) => a.get('demandeId') as string),
  );
  let converties = 0;
  for (const id of demandes) if (await convertirEnAppelOffres(s, id)) converties++;

  // 3. Appels d'offres sans aucun déblocage après 48 h : file admin (promo ou gratuit).
  const appels = s.db.collection(collections.appelsOffres);
  const sansPreneur = await appels
    .where('statut', '==', 'ouvert')
    .where('nbDeblocages', '==', 0)
    .where('ouvertLe', '<=', Timestamp.fromMillis(maintenant - SANS_PRENEUR_MS))
    .limit(LOT)
    .get();
  let signales = 0;
  for (const ao of sansPreneur.docs) {
    const ref = s.db.collection(collections.filesModeration).doc(`sans-preneur-${ao.id}`);
    const cree = await ref
      .create({
        schemaVersion: 1,
        createdAt: t,
        type: 'lead_sans_preneur',
        refs: { appelOffresId: ao.id, demandeId: ao.get('demandeId') as string },
        priorite: 3,
        statut: 'a_traiter',
        permissionRequise: 'appels_offres.tarifer',
      })
      .then(
        () => true,
        (e: { code?: number }) => {
          if (e.code !== 6) throw e;
          return false;
        },
      );
    if (cree) signales++;
  }

  // 4. Appels d'offres échus : clos.
  const echus = await appels
    .where('statut', '==', 'ouvert')
    .where('ouvertJusquau', '<=', t)
    .limit(LOT)
    .get();
  const lotClos = s.db.batch();
  for (const ao of echus.docs) lotClos.update(ao.ref, { statut: 'clos', updatedAt: t });
  if (!echus.empty) await lotClos.commit();

  return { expirees: echues.size, converties, sansPreneur: signales, clos: echus.size };
}
