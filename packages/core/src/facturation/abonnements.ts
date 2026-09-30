import { formatDate } from '../format/dates';
import type { Facturation } from './tarifs';

/**
 * Abonnements Stripe (INTEGRATIONS §1, DECISIONS D24 à D29) : catalogue créé par le script
 * idempotent (clés de recherche `ph_…`), récapitulatif avant paiement, et effet des abonnements
 * sur l'entreprise, calculé par le webhook seulement.
 */

export type ProduitAbonnement = 'premium' | 'visibilite';
export const TAUX_TVA_POURCENT = 20;

export interface PrixCatalogue {
  cle: string;
  produit: ProduitAbonnement | 'siege' | 'pack';
  nomProduit: string;
  /** Centimes HT. */
  montantHt: number;
  /** `null` : paiement unique. */
  intervalle: 'month' | 'year' | null;
  periode?: Facturation;
  credits?: number;
}

export const CATALOGUE_STRIPE: readonly PrixCatalogue[] = [
  {
    cle: 'premium_mensuel',
    produit: 'premium',
    nomProduit: 'Premium',
    montantHt: 9990,
    intervalle: 'month',
    periode: 'mensuel',
  },
  {
    cle: 'premium_annuel',
    produit: 'premium',
    nomProduit: 'Premium',
    montantHt: 95_880,
    intervalle: 'year',
    periode: 'annuel',
  },
  {
    cle: 'visibilite_mensuel',
    produit: 'visibilite',
    nomProduit: 'Option Visibilité',
    montantHt: 1290,
    intervalle: 'month',
    periode: 'mensuel',
  },
  {
    cle: 'visibilite_annuel',
    produit: 'visibilite',
    nomProduit: 'Option Visibilité',
    montantHt: 7990,
    intervalle: 'year',
    periode: 'annuel',
  },
  {
    cle: 'siege',
    produit: 'siege',
    nomProduit: 'Siège supplémentaire',
    montantHt: 900,
    intervalle: 'month',
  },
  {
    cle: 'pack_10',
    produit: 'pack',
    nomProduit: 'Pack de 10 crédits',
    montantHt: 9000,
    intervalle: null,
    credits: 10,
  },
  {
    cle: 'pack_25',
    produit: 'pack',
    nomProduit: 'Pack de 25 crédits',
    montantHt: 20_000,
    intervalle: null,
    credits: 25,
  },
  {
    cle: 'pack_50',
    produit: 'pack',
    nomProduit: 'Pack de 50 crédits',
    montantHt: 37_500,
    intervalle: null,
    credits: 50,
  },
];

/** Clé de recherche Stripe (`lookup_key`) d'un prix du catalogue. */
export const cleStripe = (cle: string) => `ph_${cle}`;

export type PrixLu =
  | { type: 'abonnement'; produit: ProduitAbonnement; periode: Facturation }
  | { type: 'siege' }
  | { type: 'pack'; credits: number };

export function lirePrix(lookupKey: string | null | undefined): PrixLu | null {
  const p = CATALOGUE_STRIPE.find((x) => cleStripe(x.cle) === lookupKey);
  if (!p) return null;
  if (p.produit === 'siege') return { type: 'siege' };
  if (p.produit === 'pack') return { type: 'pack', credits: p.credits! };
  return { type: 'abonnement', produit: p.produit, periode: p.periode! };
}

export function prixAbonnement(produit: ProduitAbonnement, periode: Facturation): PrixCatalogue {
  return CATALOGUE_STRIPE.find((p) => p.produit === produit && p.periode === periode)!;
}

/** TVA en centimes entiers (arrondi au centime le plus proche, comme Stripe Tax). */
export const tvaDe = (ht: number) => Math.round((ht * TAUX_TVA_POURCENT) / 100);

/** Récapitulatif de la page de paiement : en annuel, le total dû couvre 12 mois (ACQ-03). */
export function recapPaiement(produit: ProduitAbonnement, periode: Facturation) {
  const p = prixAbonnement(produit, periode);
  const tva = tvaDe(p.montantHt);
  return {
    cle: p.cle,
    montantHt: p.montantHt,
    tva,
    montantTtc: p.montantHt + tva,
    parMoisHt: periode === 'annuel' && produit === 'premium' ? p.montantHt / 12 : p.montantHt,
  };
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
}

export const SIEGES_INCLUS = { gratuit: 1, premium: 3 } as const;
/** Délai de grâce après un échec de paiement au renouvellement (INTEGRATIONS §1). */
export const GRACE_PAIEMENT_MS = 7 * 86_400_000;

function actif(a: AbonnementEtat, maintenant: number): boolean {
  if (a.statut === 'active' || a.statut === 'trialing') return true;
  return a.statut === 'past_due' && maintenant < a.debutPeriode + GRACE_PAIEMENT_MS;
}

export interface EffetFacturation {
  plan: 'gratuit' | 'premium';
  planExpireLe: number | null;
  optionVisibilite: boolean;
  optionVisibiliteExpireLe: number | null;
  siegesMax: number;
  paiementEnEchec: boolean;
}

/** Effet de tous les abonnements d'une entreprise ; Premium inclut la visibilité (D25). */
export function effetAbonnements(
  abonnements: readonly AbonnementEtat[],
  maintenant: number,
): EffetFacturation {
  const actifs = abonnements.filter((a) => actif(a, maintenant));
  const premium = actifs.find((a) => a.produit === 'premium');
  const visibilite = actifs.find((a) => a.produit === 'visibilite');
  return {
    plan: premium ? 'premium' : 'gratuit',
    planExpireLe: premium?.finPeriode ?? null,
    optionVisibilite: Boolean(premium ?? visibilite),
    optionVisibiliteExpireLe: (premium ?? visibilite)?.finPeriode ?? null,
    siegesMax: premium ? SIEGES_INCLUS.premium + premium.sieges : SIEGES_INCLUS.gratuit,
    paiementEnEchec: abonnements.some((a) => a.statut === 'past_due'),
  };
}

/** Avantages rappelés sur la page de paiement (maquettes Paiement Offre Premium / Option Visibilité). */
export const AVANTAGES_OFFRE: Record<ProduitAbonnement, readonly string[]> = {
  premium: [
    '4 mises en relation exclusives par mois, sinon le 2e mois est offert',
    'Priorité sur les appels d’offres de votre zone',
    'Toute l’option Visibilité incluse',
    '0 % de commission, résiliable en un clic',
  ],
  visibilite: [
    'Mise en avant dans l’annuaire de votre secteur',
    'Téléphone affiché sur votre fiche',
    'Badge Visibilité et statistiques de votre fiche',
    '0 % de commission',
  ],
};

export const NOMS_OFFRE: Record<ProduitAbonnement, string> = {
  premium: 'Abonnement Premium',
  visibilite: 'Option Visibilité',
};

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
