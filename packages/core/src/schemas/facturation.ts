import { z } from '../zod';
import { centimesPositifs, horodatage, id, meta, schemaVersion } from './commun';

/** Miroirs Stripe, écrits par les webhooks uniquement (DATABASE §8). */
export const abonnement = z.object({
  ...meta,
  artisanId: id,
  produit: z.enum(['premium', 'visibilite']),
  priceId: z.string().startsWith('price_'),
  periode: z.enum(['mensuel', 'annuel']),
  statut: z.enum([
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused',
  ]),
  debutPeriode: horodatage,
  finPeriode: horodatage,
  annulationFinPeriode: z.boolean(),
  annuleLe: horodatage.optional(),
  codePromo: z.string().optional(),
  sieges: z.number().int().nonnegative().default(0),
});

export const facture = z
  .object({
    schemaVersion,
    artisanId: id,
    numero: z.string(),
    montantHtCentimes: centimesPositifs,
    tvaCentimes: centimesPositifs,
    montantTtcCentimes: centimesPositifs,
    devise: z.literal('eur'),
    statut: z.enum(['draft', 'open', 'paid', 'uncollectible', 'void']),
    pdfUrl: z.url().optional(),
    hostedUrl: z.url().optional(),
    periodeDebut: horodatage,
    periodeFin: horodatage,
    payeeLe: horodatage.optional(),
    createdAt: horodatage,
  })
  .refine((f) => f.montantHtCentimes + f.tvaCentimes === f.montantTtcCentimes, {
    message: 'HT + TVA ≠ TTC',
    path: ['montantTtcCentimes'],
  });

export const paiement = z.object({
  schemaVersion,
  artisanId: id,
  montantCentimes: centimesPositifs,
  statut: z.string(),
  last4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  brand: z.string().optional(),
  echecMotif: z.string().optional(),
  createdAt: horodatage,
});

export const codePromo = z.object({
  ...meta,
  /** Créé chez Stripe au premier clic sur le code (codes de conversion réservés à l'envoi). */
  stripePromotionCodeId: z.string().startsWith('promo_').optional(),
  couponId: z.string(),
  pourcentage: z.number().int().min(1).max(100),
  duree: z.enum(['once', 'repeating', 'forever']),
  dureeMois: z.number().int().positive().optional(),
  produits: z.array(z.enum(['premium', 'visibilite', 'pack'])),
  actif: z.boolean(),
  utilisations: z.number().int().nonnegative(),
  maxUtilisations: z.number().int().positive().optional(),
  expireLe: horodatage.optional(),
  source: z.enum(['admin', 'conversion']),
  artisanId: id.optional(),
  modele: z.string().optional(),
  creePar: z.string(),
});

export const evenementStripe = z.object({
  schemaVersion,
  type: z.string(),
  traiteLe: horodatage,
  ok: z.boolean(),
  erreur: z.string().optional(),
});
