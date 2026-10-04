import { z } from '../zod';
import {
  centimesPositifs,
  codePostal,
  geo,
  geohash,
  horodatage,
  id,
  meta,
  pourcent,
  schemaVersion,
} from './commun';

const tarification = z.object({
  mode: z.enum(['auto', 'manuel', 'gratuit']),
  prixBaseCentimes: centimesPositifs,
  prixPremiumCentimes: centimesPositifs,
  prixCredits: z.number().int().nonnegative(),
  grilleId: id.optional(),
  detailCalcul: z.record(z.string(), z.number()).optional(),
  fixePar: id.optional(),
  fixeLe: horodatage,
  prixPlancherCentimes: centimesPositifs,
  prixPlafondCentimes: centimesPositifs,
  promo: z
    .object({ pourcentage: z.number().int().min(1).max(100), jusquau: horodatage })
    .optional(),
  historique: z
    .array(
      z.object({
        le: horodatage,
        par: z.string(),
        ancien: centimesPositifs,
        nouveau: centimesPositifs,
        motif: z.string().optional(),
      }),
    )
    .default([]),
});

/** `appelsOffres/{id}` : demande ANONYMISÉE (ni nom, ni rue, ni téléphone). */
export const appelOffres = z
  .object({
    ...meta,
    demandeId: id,
    titre: z.string().max(140),
    resume: z.string().max(1000),
    metier: id,
    metiersSecondaires: z.array(id).default([]),
    ville: z.string(),
    codePostal,
    geo,
    geohash,
    budgetMinCentimes: centimesPositifs,
    budgetMaxCentimes: centimesPositifs,
    trancheBudget: z.enum(['S', 'M', 'L', 'XL']),
    urgence: z.enum(['normale', 'rapide', 'urgente']),
    exigences: z.array(z.string()).default([]),
    qualiteLead: pourcent,
    tarification,
    nbDeblocagesMax: z.number().int().min(1).max(3),
    nbDeblocages: z.number().int().nonnegative(),
    acces: z.enum(['tous', 'premium_seul', 'premium_prioritaire']),
    fenetrePremiumMin: z.number().int().nonnegative(),
    ouvertLe: horodatage,
    ouvertJusquau: horodatage,
    statut: z.enum(['brouillon', 'ouvert', 'complet', 'clos', 'annule', 'suspendu']),
    publiePar: z.string(),
    /** Artisans éligibles prévenus à la publication (pas deux fois pour la même demande). */
    artisansInvites: z.array(id).max(50).default([]),
  })
  .refine((a) => a.nbDeblocages <= a.nbDeblocagesMax, {
    message: 'Trop de déblocages',
    path: ['nbDeblocages'],
  });

export const deblocage = z.object({
  schemaVersion,
  achatId: id,
  moyen: z.enum(['carte', 'credits', 'inclus_premium', 'offert_admin']),
  montantCentimes: centimesPositifs,
  credits: z.number().int().nonnegative(),
  debloqueLe: horodatage,
  vuCoordonneesLe: horodatage.optional(),
  statut: z.enum(['actif', 'rembourse']),
});

export const reponseAppelOffres = z.object({
  schemaVersion,
  message: z.string().min(1).max(2000),
  montantIndicatifCentimes: centimesPositifs.optional(),
  delaiJours: z.number().int().nonnegative().optional(),
  statut: z.enum(['envoyee', 'vue', 'retenue', 'non_retenue']),
  createdAt: horodatage,
});

export const historiquePrix = z.object({
  schemaVersion,
  mode: z.enum(['auto', 'manuel', 'gratuit']),
  prixHtCentimes: centimesPositifs,
  par: z.string(),
  motif: z.string().optional(),
  validePar: id.optional(),
  createdAt: horodatage,
});

const coef = z.number().positive();

/** `grillesTarifaires/{id}` : barème automatique des appels d'offres. */
export const grilleTarifaire = z.object({
  ...meta,
  nom: z.string(),
  actif: z.boolean(),
  zone: z.object({ departements: z.array(z.string().regex(/^\d{2,3}$/)) }),
  prixBaseParMetier: z.record(z.string(), centimesPositifs),
  prixBaseDefaut: centimesPositifs,
  coefBudget: z.object({ S: coef, M: coef, L: coef, XL: coef }),
  coefUrgence: z.object({ normale: coef, rapide: coef, urgente: coef }),
  coefQualite: z.array(z.object({ min: pourcent, coef })),
  coefConcurrence: z.object({ faible: coef, normale: coef, forte: coef }),
  seuilsConcurrence: z.object({
    faibleJusqua: z.number().int().nonnegative(),
    forteDes: z.number().int().positive(),
  }),
  coefNiveau: z.object({ A: coef, B: coef, C: coef }).optional(),
  coefEligibilite: z.object({ eligible: coef, non_eligible: coef }).optional(),
  remisePremium: z.number().min(0).max(1),
  centimesParCredit: z.number().int().positive(),
  plancher: centimesPositifs,
  plafond: centimesPositifs,
  arrondi: z.number().int().positive(),
  version: z.number().int().positive(),
  modifiePar: id,
});

/** `achatsLeads/{id}` : pièce comptable, immuable sauf statut. */
export const achatLead = z.object({
  schemaVersion,
  artisanId: id,
  appelOffreId: id,
  demandeId: id,
  moyen: z.enum(['carte', 'credits', 'inclus_premium', 'offert_admin']),
  prixHtCentimes: centimesPositifs,
  tvaCentimes: centimesPositifs,
  credits: z.number().int().nonnegative(),
  stripePaymentIntentId: z.string().optional(),
  stripeInvoiceId: z.string().optional(),
  statut: z.enum(['paye', 'rembourse', 'rembourse_credits', 'litige']),
  /** Membre qui a débloqué (plafond par collaborateur, historique). */
  par: id.optional(),
  createdAt: horodatage,
});

export const portefeuille = z.object({
  schemaVersion,
  soldeCredits: z.number().int().nonnegative(),
  creditsInclusMois: z.number().int().nonnegative(),
  creditsInclusRestants: z.number().int().nonnegative(),
  renouvelleLe: horodatage.optional(),
  updatedAt: horodatage,
});

export const mouvementCredits = z.object({
  schemaVersion,
  type: z.enum([
    'inclus_premium',
    'achat_pack',
    'debit_lead',
    'remboursement',
    'geste_admin',
    'expiration',
  ]),
  credits: z
    .number()
    .int()
    .refine((c) => c !== 0, 'Mouvement nul'),
  soldeApres: z.number().int().nonnegative(),
  refId: z.string().optional(),
  par: z.string(),
  motif: z.string().optional(),
  expireLe: horodatage.optional(),
  createdAt: horodatage,
});

export const packCredits = z.object({
  ...meta,
  nom: z.string(),
  credits: z.number().int().positive(),
  prixHtCentimes: centimesPositifs,
  stripePriceId: z.string().startsWith('price_'),
  bonusCredits: z.number().int().nonnegative().default(0),
  actif: z.boolean(),
  ordre: z.number().int(),
});

export const remboursementLead = z.object({
  ...meta,
  achatId: id,
  artisanId: id,
  motif: z.enum([
    'faux_numero',
    'projet_inexistant',
    'hors_zone',
    'doublon',
    'deja_realise',
    'autre',
  ]),
  details: z.string().max(2000),
  preuves: z.array(z.string()).default([]),
  statut: z.enum(['ouvert', 'accepte', 'refuse']),
  decisionPar: id.optional(),
  decisionLe: horodatage.optional(),
  rembourseEn: z.enum(['credits', 'carte']).optional(),
});
