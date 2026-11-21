import { Timestamp } from 'firebase-admin/firestore';
import { chemins, collections, GROUPE_ATTRIBUTIONS } from '../../chemins';
import { convertirEnAppelOffres, type ServicesMatching } from './attribuer';

/**
 * `matchingRelance` (MATCHING [7], toutes les 15 minutes) : propositions expirées, demandes
 * garanties non acceptées converties en appel d'offres (D41), appels d'offres sans preneur
 * signalés à l'admin après 48 h, appels d'offres échus clos.
 */
const LOT = 200;
const SANS_PRENEUR_MS = 48 * 3_600_000;
const FENETRE_REFUS_MS = 60 * 60_000;
/** Demandes partenaires sans preneur : invendues à 24 h, archivées à 72 h (CONVERSION §3 bis). */
const INVENDUE_MS = 24 * 3_600_000;
const ARCHIVE_MS = 72 * 3_600_000;
/** Supervision : import partenaire encore sans proposition après 15 min (cible < 5 min, IMP-04). */
const RETARD_IMPORT_MS = 15 * 60_000;

export interface BilanRelance {
  expirees: number;
  converties: number;
  sansPreneur: number;
  clos: number;
  invendues: number;
  archivees: number;
  /** Demandes encore « nouvelles » au-delà de 15 min (alerte de supervision). */
  enRetard: number;
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
        permissionRequise: 'leads.prix',
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

  const partenaires = await invenduesPartenaires(s, maintenant);
  const enRetard = await s.db
    .collection(collections.demandes)
    .where('statut', '==', 'nouvelle')
    .where('createdAt', '<=', Timestamp.fromMillis(maintenant - RETARD_IMPORT_MS))
    .count()
    .get();

  return {
    expirees: echues.size,
    converties,
    sansPreneur: signales,
    clos: echus.size,
    ...partenaires,
    enRetard: enRetard.data().count,
  };
}

/**
 * Appels d'offres de demandes partenaires sans aucun déblocage : la demande est marquée invendue
 * à 24 h (offre aux artisans Gratuit : moteur de conversion, lot 13b), puis archivée à 72 h et
 * jamais revendue (appel d'offres clos, demande close).
 */
async function invenduesPartenaires(s: ServicesMatching, maintenant: number) {
  const t = Timestamp.fromMillis(maintenant);
  const sansDeblocage = await s.db
    .collection(collections.appelsOffres)
    .where('statut', '==', 'ouvert')
    .where('nbDeblocages', '==', 0)
    .where('ouvertLe', '<=', Timestamp.fromMillis(maintenant - INVENDUE_MS))
    .limit(LOT)
    .get();
  if (sansDeblocage.empty) return { invendues: 0, archivees: 0 };
  const demandes = await s.db.getAll(
    ...sansDeblocage.docs.map((a) => s.db.doc(chemins.demande(a.get('demandeId') as string))),
  );
  const lot = s.db.batch();
  let invendues = 0;
  let archivees = 0;
  sansDeblocage.docs.forEach((ao, i) => {
    const d = demandes[i];
    if (!d?.exists || d.get('source') !== 'partenaire' || d.get('archiveeLe')) return;
    const age = maintenant - (d.get('createdAt') as Timestamp).toMillis();
    if (age >= ARCHIVE_MS) {
      lot.update(ao.ref, { statut: 'clos', updatedAt: t });
      lot.update(d.ref, { statut: 'close', archiveeLe: t, updatedAt: t });
      archivees++;
    } else if (!d.get('invendueLe')) {
      lot.update(d.ref, { invendueLe: t, updatedAt: t });
      invendues++;
    }
  });
  if (invendues || archivees) await lot.commit();
  return { invendues, archivees };
}
