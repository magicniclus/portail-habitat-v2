import {
  controlerParametres,
  controlerPrixManuel,
  controlerPromo,
  prixDepuisDetail,
  statutApresParametres,
  type PrixManuel,
} from '@ph/core/admin';
import { ErreurMetier } from '@ph/core/erreurs';
import { BAREME_DEFAUT, type DetailCalcul } from '@ph/core/leads';
import {
  FieldValue,
  Timestamp,
  type DocumentSnapshot,
  type Firestore,
  type Query,
} from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { auditerAdmin } from './audit';

/** Back-office › Appels d'offres et prix (ADMIN §2.5) : liste et éditeur de prix. */

export const FILTRES_APPELS_OFFRES = ['ouverts', 'complets', 'termines', 'tous'] as const;
export type FiltreAppelsOffres = (typeof FILTRES_APPELS_OFFRES)[number];

const STATUTS: Record<FiltreAppelsOffres, string[] | null> = {
  ouverts: ['ouvert', 'suspendu'],
  complets: ['complet'],
  termines: ['clos', 'annule'],
  tous: null,
};

export interface LigneAppelOffresAdmin {
  id: string;
  titre: string;
  statut: string;
  mode: 'auto' | 'manuel' | 'gratuit';
  prixBaseCentimes: number;
  promo: number | null;
  nbDeblocages: number;
  nbDeblocagesMax: number;
  ouvertLe: number;
  qualiteLead: number;
}

const ms = (t: unknown) => (t as Timestamp | undefined)?.toMillis() ?? 0;

function ligne(d: DocumentSnapshot): LigneAppelOffresAdmin {
  return {
    id: d.id,
    titre: d.get('titre') as string,
    statut: d.get('statut') as string,
    mode: d.get('tarification.mode') as LigneAppelOffresAdmin['mode'],
    prixBaseCentimes: d.get('tarification.prixBaseCentimes') as number,
    promo: (d.get('tarification.promo.pourcentage') as number | undefined) ?? null,
    nbDeblocages: d.get('nbDeblocages') as number,
    nbDeblocagesMax: d.get('nbDeblocagesMax') as number,
    ouvertLe: ms(d.get('ouvertLe')),
    qualiteLead: d.get('qualiteLead') as number,
  };
}

export async function listerAppelsOffresAdmin(
  db: Firestore,
  filtre: FiltreAppelsOffres,
): Promise<LigneAppelOffresAdmin[]> {
  let q: Query = db.collection(collections.appelsOffres);
  const statuts = STATUTS[filtre];
  if (statuts) q = q.where('statut', 'in', statuts);
  const r = await q.orderBy('ouvertLe', 'desc').limit(100).get();
  return r.docs.map(ligne);
}

export interface FicheAppelOffresAdmin extends LigneAppelOffresAdmin {
  demandeId: string;
  ouvertJusquau: number;
  acces: 'tous' | 'premium_seul' | 'premium_prioritaire';
  prixPremiumCentimes: number;
  prixCredits: number;
  plancher: number;
  plafond: number;
  detailCalcul: DetailCalcul | null;
  promoJusquau: number | null;
  historique: { le: number; mode: string; prixHtCentimes: number; motif: string | null }[];
}

export async function lireAppelOffresAdmin(
  db: Firestore,
  id: string,
): Promise<FicheAppelOffresAdmin | null> {
  const [d, h] = await Promise.all([
    db.doc(chemins.appelOffres(id)).get(),
    db.collection(chemins.historiquePrix(id)).orderBy('createdAt', 'desc').limit(20).get(),
  ]);
  if (!d.exists) return null;
  const t = d.get('tarification') as Record<string, unknown>;
  const promo = t.promo as { jusquau: Timestamp } | undefined;
  return {
    ...ligne(d),
    demandeId: d.get('demandeId') as string,
    ouvertJusquau: ms(d.get('ouvertJusquau')),
    acces: d.get('acces') as FicheAppelOffresAdmin['acces'],
    prixPremiumCentimes: t.prixPremiumCentimes as number,
    prixCredits: t.prixCredits as number,
    plancher: t.prixPlancherCentimes as number,
    plafond: t.prixPlafondCentimes as number,
    detailCalcul: (t.detailCalcul as DetailCalcul | undefined) ?? null,
    promoJusquau: promo ? ms(promo.jusquau) : null,
    historique: h.docs.map((x) => ({
      le: ms(x.get('createdAt')),
      mode: x.get('mode') as string,
      prixHtCentimes: x.get('prixHtCentimes') as number,
      motif: (x.get('motif') as string | undefined) ?? null,
    })),
  };
}

type Services = { db: Firestore; horloge: () => number };
const MODIFIABLES = ['brouillon', 'ouvert', 'complet', 'suspendu'];

/**
 * Lit l'appel d'offres modifiable dans la transaction, applique la modification, écrit l'audit
 * (avant, après, motif). Le prix est figé au déblocage : seuls les suivants sont concernés.
 */
async function modifier(
  s: Services,
  e: { acteurUid: string; appelOffresId: string; motif: string; action: string },
  calcul: (
    d: DocumentSnapshot,
    t0: Timestamp,
  ) => { maj: Record<string, unknown>; avant: unknown; apres: unknown; prixHt?: number },
): Promise<void> {
  const ref = s.db.doc(chemins.appelOffres(e.appelOffresId));
  const t0 = Timestamp.fromMillis(s.horloge());
  await s.db.runTransaction(async (t) => {
    const d = await t.get(ref);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE');
    if (!MODIFIABLES.includes(d.get('statut') as string))
      throw new ErreurMetier('CONFLIT', 'Cet appel d’offres est terminé.');
    const r = calcul(d, t0);
    t.update(ref, { ...r.maj, updatedAt: t0 });
    if (r.prixHt !== undefined)
      t.create(s.db.collection(chemins.historiquePrix(e.appelOffresId)).doc(), {
        schemaVersion: 1,
        mode: r.maj['tarification.mode'],
        prixHtCentimes: r.prixHt,
        par: e.acteurUid,
        motif: e.motif,
        createdAt: t0,
      });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: e.action,
        cible: ref.path,
        avant: r.avant,
        apres: r.apres,
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
  });
}

/** `adminFixerPrixLead` : prix manuel (bornes ou `leads.prix_illimite`), gratuit, ou retour au calcul. */
export async function fixerPrixAppelOffresAdmin(
  s: Services,
  e: {
    acteurUid: string;
    appelOffresId: string;
    mode: 'auto' | 'manuel' | 'gratuit';
    prix?: PrixManuel;
    illimite: boolean;
    motif: string;
  },
): Promise<void> {
  await modifier(s, { ...e, action: 'adminFixerPrixLead' }, (d, t0) => {
    const t = d.get('tarification') as Record<string, unknown>;
    let prix: PrixManuel;
    if (e.mode === 'manuel') {
      prix = e.prix!;
      const erreur = controlerPrixManuel(
        prix,
        { plancher: t.prixPlancherCentimes as number, plafond: t.prixPlafondCentimes as number },
        e.illimite,
      );
      if (erreur) throw new ErreurMetier('PERMISSION_REFUSEE', erreur);
    } else if (e.mode === 'gratuit')
      prix = { prixBaseCentimes: 0, prixPremiumCentimes: 0, prixCredits: 0 };
    else {
      if (!t.detailCalcul) throw new ErreurMetier('PRECONDITION', 'Aucun calcul automatique.');
      prix = prixDepuisDetail(t.detailCalcul as DetailCalcul, BAREME_DEFAUT);
    }
    const ancien = t.prixBaseCentimes as number;
    return {
      maj: {
        'tarification.mode': e.mode,
        'tarification.prixBaseCentimes': prix.prixBaseCentimes,
        'tarification.prixPremiumCentimes': prix.prixPremiumCentimes,
        'tarification.prixCredits': prix.prixCredits,
        'tarification.fixePar': e.acteurUid,
        'tarification.fixeLe': t0,
        'tarification.historique': FieldValue.arrayUnion({
          le: t0,
          par: e.acteurUid,
          ancien,
          nouveau: prix.prixBaseCentimes,
          motif: e.motif,
        }),
      },
      avant: { mode: t.mode, prixBaseCentimes: ancien },
      apres: { mode: e.mode, ...prix },
      prixHt: prix.prixBaseCentimes,
    };
  });
}

/** Promo (pourcentage jusqu'à une date, au plus tard la clôture) ou retrait de la promo. */
export async function promoAppelOffresAdmin(
  s: Services,
  e: {
    acteurUid: string;
    appelOffresId: string;
    pourcentage?: number;
    jusquau?: number;
    motif: string;
  },
): Promise<void> {
  await modifier(s, { ...e, action: 'adminPromoLead' }, (d) => {
    const avant = (d.get('tarification.promo') as unknown) ?? null;
    if (e.pourcentage === undefined)
      return { maj: { 'tarification.promo': FieldValue.delete() }, avant, apres: null };
    if (e.jusquau === undefined) throw new ErreurMetier('ENTREE_INVALIDE', 'Date de fin requise.');
    const erreur = controlerPromo(e.jusquau, {
      maintenant: s.horloge(),
      ouvertJusquau: ms(d.get('ouvertJusquau')),
    });
    if (erreur) throw new ErreurMetier('ENTREE_INVALIDE', erreur);
    const promo = { pourcentage: e.pourcentage, jusquau: Timestamp.fromMillis(e.jusquau) };
    return { maj: { 'tarification.promo': promo }, avant, apres: promo };
  });
}

/** Nombre maximal de déblocages (jamais sous ceux déjà faits) et accès. */
export async function parametresAppelOffresAdmin(
  s: Services,
  e: {
    acteurUid: string;
    appelOffresId: string;
    nbDeblocagesMax: number;
    acces: 'tous' | 'premium_seul' | 'premium_prioritaire';
    motif: string;
  },
): Promise<void> {
  await modifier(s, { ...e, action: 'adminParametresLead' }, (d) => {
    const nb = d.get('nbDeblocages') as number;
    const erreur = controlerParametres(e.nbDeblocagesMax, nb);
    if (erreur) throw new ErreurMetier('CONFLIT', erreur);
    const statut = statutApresParametres(d.get('statut') as string, e.nbDeblocagesMax, nb);
    return {
      maj: { nbDeblocagesMax: e.nbDeblocagesMax, acces: e.acces, statut },
      avant: {
        nbDeblocagesMax: d.get('nbDeblocagesMax') as number,
        acces: d.get('acces') as string,
        statut: d.get('statut') as string,
      },
      apres: { nbDeblocagesMax: e.nbDeblocagesMax, acces: e.acces, statut },
    };
  });
}
