import { z } from '../zod';
import { centimesPositifs, horodatage, id, meta, schemaVersion } from './commun';

/** Collections de IA_ADMIN.md §6. */
export const contexteIa = z.object({
  schemaVersion,
  json: z.string(),
  tokensEstimes: z.number().int().max(6000),
  updatedAt: horodatage,
});

export const analyseIa = z.object({
  ...meta,
  mode: z.enum(['rapide', 'audit']),
  perimetres: z.array(z.string()).min(1),
  question: z.string().max(1000).optional(),
  approfondie: z.boolean(),
  demandePar: z.string(),
  modele: z.string(),
  promptVersion: z.string(),
  resume: z.string(),
  etapes: z
    .array(z.object({ etape: z.string(), score: z.number(), constat: z.string() }))
    .default([]),
  gainTotal: z.string().optional(),
  questionsOuvertes: z.array(z.string()).default([]),
  tokensEntree: z.number().int().nonnegative(),
  tokensSortie: z.number().int().nonnegative(),
  coutCentimes: centimesPositifs,
  dureeMs: z.number().nonnegative(),
  cleCache: z.string(),
  /** Sources de contexte utilisées (périmètres et date du contexte). */
  sources: z.array(z.string()).default([]),
  statut: z.enum(['ok', 'erreur']),
  erreur: z.string().optional(),
});

const niveau = z.enum(['élevé', 'moyen', 'faible']);

export const recommandationIa = z.object({
  ...meta,
  analyseId: id,
  titre: z.string(),
  perimetre: z.string(),
  etape: z.string(),
  gainEstime: z.string(),
  priorite: z.number().int().min(1).max(5),
  impact: niveau,
  effort: niveau,
  confiance: z.number().min(0).max(1),
  constat: z.string(),
  preuves: z.array(z.object({ source: z.string(), ref: z.string(), valeur: z.string() })),
  action: z.object({ type: z.string(), details: z.string() }),
  propositionTexte: z.string().optional(),
  statut: z.enum(['nouvelle', 'en_cours', 'faite', 'ignoree']),
  motifIgnore: z.string().optional(),
  effetMesure: z.string().optional(),
});

/** `iaQuotas/{uid_jour}` (analyses du jour) et `iaQuotas/budget_{mois}` (dépense du mois). */
export const quotaIa = z.object({
  schemaVersion,
  utilisations: z.number().int().nonnegative().optional(),
  coutCentimes: centimesPositifs.optional(),
  expireLe: horodatage,
});

/** `iaRedactions/{id}` : jamais le texte rédigé, seulement la mesure (TTL 90 j). */
export const redactionIa = z
  .object({
    schemaVersion,
    artisanId: id,
    type: z.enum(['apropos', 'projet']),
    action: z.string(),
    ton: z.string().optional(),
    accepte: z.boolean(),
    tokens: z.number().int().nonnegative(),
    coutCentimes: centimesPositifs,
    createdAt: horodatage,
    expireLe: horodatage,
  })
  .strict();

export const configIa = z.object({
  schemaVersion,
  actif: z.boolean(),
  modeleDefaut: z.string(),
  modeleApprofondi: z.string(),
  promptVersion: z.string(),
  quotaJour: z.number().int().positive(),
  budgetMensuelCentimes: centimesPositifs,
  consignes: z.array(z.string()),
  auditHebdo: z.boolean(),
  updatedAt: horodatage,
});
