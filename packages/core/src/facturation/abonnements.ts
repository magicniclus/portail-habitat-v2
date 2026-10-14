import { formatDate } from '../format/dates';
import {
  NOMS_FORMULE,
  PRIX_FORMULES_HT,
  siegesInclus,
  type Formule,
  type FormulePayante,
} from '../paiements/droits';

/**
 * Abonnements Stripe (PAIEMENTS.md, INTEGRATIONS §1) : catalogue créé par le script idempotent
 * (clés de recherche `ph_…`), récapitulatif avant paiement, et effet des abonnements sur
 * l'entreprise, calculé par le webhook seulement. Une seule formule active par entreprise.
 */

export type ProduitAbonnement = FormulePayante;
export const TAUX_TVA_POURCENT = 20;

export interface PrixCatalogue {
  cle: string;
  produit: ProduitAbonnement | 'siege' | 'credits' | 'ia';
  nomProduit: string;
  /** Centimes HT. */
  montantHt: number;
  /** `null` : paiement unique. */
  intervalle: 'month' | null;
  /** Crédits ajoutés au portefeuille (packs de crédits, D59). */
  credits?: number;
  /** Modifications IA ajoutées au quota du mois (pack IA, D52). */
  modificationsIa?: number;
}

const formule = (f: ProduitAbonnement): PrixCatalogue => ({
  cle: f,
  produit: f,
  nomProduit: NOMS_FORMULE[f],
  montantHt: PRIX_FORMULES_HT[f],
  intervalle: 'month',
});
const pack = (euros: number, credits: number): PrixCatalogue => ({
  cle: `credits_${euros}`,
  produit: 'credits',
  nomProduit: `Pack de ${credits} crédits`,
  montantHt: euros * 100,
  intervalle: null,
  credits,
});

export const CATALOGUE_STRIPE: readonly PrixCatalogue[] = [
  formule('fiche_pro'),
  formule('site_pro'),
  formule('pack_fiche_site'),
  formule('tout_inclus'),
  {
    cle: 'siege',
    produit: 'siege',
    nomProduit: 'Siège supplémentaire',
    montantHt: 900,
    intervalle: 'month',
  },
  pack(50, 50),
  pack(100, 110),
  pack(250, 290),
  {
    cle: 'ia_100',
    produit: 'ia',
    nomProduit: 'Pack IA : 100 modifications',
    montantHt: 290,
    intervalle: null,
    modificationsIa: 100,
  },
];

/** Clé de recherche Stripe (`lookup_key`) d'un prix du catalogue. */
export const cleStripe = (cle: string) => `ph_${cle}`;

export type PrixLu =
  | { type: 'abonnement'; produit: ProduitAbonnement }
  | { type: 'siege' }
  | { type: 'credits'; credits: number }
  | { type: 'ia'; modifications: number };

export function lirePrix(lookupKey: string | null | undefined): PrixLu | null {
  const p = CATALOGUE_STRIPE.find((x) => cleStripe(x.cle) === lookupKey);
  if (!p) return null;
  if (p.produit === 'siege') return { type: 'siege' };
  if (p.produit === 'credits') return { type: 'credits', credits: p.credits! };
  if (p.produit === 'ia') return { type: 'ia', modifications: p.modificationsIa! };
  return { type: 'abonnement', produit: p.produit };
}

export function prixAbonnement(produit: ProduitAbonnement): PrixCatalogue {
  return CATALOGUE_STRIPE.find((p) => p.produit === produit)!;
}

/** TVA en centimes entiers (arrondi au centime le plus proche, comme Stripe Tax). */
export const tvaDe = (ht: number) => Math.round((ht * TAUX_TVA_POURCENT) / 100);

/** Récapitulatif de la fenêtre de paiement : HT, TVA, TTC d'une mensualité (PAY-02). */
export function recapPaiement(produit: ProduitAbonnement) {
  const p = prixAbonnement(produit);
  const tva = tvaDe(p.montantHt);
  return { cle: p.cle, montantHt: p.montantHt, tva, montantTtc: p.montantHt + tva };
}

export type StatutAbonnement =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export interface AbonnementEtat {
  produit: ProduitAbonnement;
  statut: StatutAbonnement;
  /** Millisecondes. */
  debutPeriode: number;
  finPeriode: number;
  /** Sièges achetés en plus des sièges inclus. */
  sieges: number;
  annulationFinPeriode?: boolean;
}

/** Délai de grâce après un échec de paiement au renouvellement (PAIEMENTS §4). */
export const GRACE_PAIEMENT_MS = 7 * 86_400_000;

function actif(a: AbonnementEtat, maintenant: number): boolean {
  if (a.statut === 'active' || a.statut === 'trialing') return true;
  return a.statut === 'past_due' && maintenant < a.debutPeriode + GRACE_PAIEMENT_MS;
}

/** Ordre de préférence si plusieurs abonnements restent actifs (changement en cours). */
const RANG: Record<ProduitAbonnement, number> = {
  tout_inclus: 4,
  pack_fiche_site: 3,
  fiche_pro: 2,
  site_pro: 1,
};

export interface EffetFacturation {
  formule: Formule;
  /** État affiché à l'artisan (`droits.statut`, PAIEMENTS §5). */
  statut: 'actif' | 'grace' | 'resilie_fin_periode';
  finPeriode: number | null;
  siegesMax: number;
  paiementEnEchec: boolean;
}

/** Effet de tous les abonnements d'une entreprise : la formule active la plus complète. */
export function effetAbonnements(
  abonnements: readonly AbonnementEtat[],
  maintenant: number,
): EffetFacturation {
  const a = abonnements
    .filter((x) => actif(x, maintenant))
    .sort((x, y) => RANG[y.produit] - RANG[x.produit])[0];
  const f: Formule = a?.produit ?? 'gratuit';
  return {
    formule: f,
    statut:
      a?.statut === 'past_due'
        ? 'grace'
        : a?.annulationFinPeriode
          ? 'resilie_fin_periode'
          : 'actif',
    finPeriode: a?.finPeriode ?? null,
    siegesMax: siegesInclus(f) + (f === 'tout_inclus' ? (a?.sieges ?? 0) : 0),
    paiementEnEchec: abonnements.some((x) => x.statut === 'past_due'),
  };
}

export const LIBELLES_STATUT_FACTURE: Record<string, string> = {
  paid: 'Payée',
  open: 'À payer',
  draft: 'En préparation',
  uncollectible: 'Impayée',
  void: 'Annulée',
};

/** Ligne d'état d'un abonnement sur la page Facturation. */
export function etatAbonnement(a: {
  statut: StatutAbonnement;
  annulationFinPeriode: boolean;
  finPeriode: number;
}): { texte: string; ton: 'succes' | 'attention' | 'danger' } {
  const date = formatDate(a.finPeriode, 'long');
  if (a.statut === 'past_due' || a.statut === 'unpaid')
    return { texte: 'Paiement refusé : mettez à jour votre carte sous 7 jours', ton: 'danger' };
  if (a.statut === 'incomplete')
    return { texte: 'Paiement en attente de confirmation', ton: 'attention' };
  if (a.annulationFinPeriode) return { texte: `Résilié, actif jusqu’au ${date}`, ton: 'attention' };
  return { texte: `Actif · prochaine échéance le ${date}`, ton: 'succes' };
}
