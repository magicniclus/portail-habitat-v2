import { z } from '../zod';
import { horodatage, schemaVersion } from './commun';

/** Métadonnées d'un plan (DESSIN.md §4) : `users/{uid}/plans/{id}` ou `artisans/{id}/plans/{id}`. */
export const planDessin = z.object({
  schemaVersion,
  titre: z.string().trim().min(1).max(120),
  vignettePath: z.string().max(300).optional(),
  /** 0 tant qu'aucune version n'a été enregistrée. */
  versionCourante: z.number().int().min(0),
  /** Taille de la scène compressée, en octets (quota de 5 Mo). */
  taille: z
    .number()
    .int()
    .min(0)
    .max(5 * 1024 * 1024),
  creeLe: horodatage,
  majLe: horodatage,
  supprimeLe: horodatage.nullable(),
  demandeId: z.string().max(64).optional(),
  /** Côté artisan uniquement. */
  clientNom: z.string().trim().max(120).optional(),
  auteurUid: z.string().max(128).optional(),
});

export const TYPES_VERSION_PLAN = ['auto', 'manuelle', 'restauration'] as const;

/** `…/plans/{id}/versions/{id}` : ajout seul, écrit par le serveur. */
export const versionPlan = z.object({
  numero: z.number().int().min(1),
  storagePath: z.string().min(1).max(300),
  auteurUid: z.string().max(128),
  type: z.enum(TYPES_VERSION_PLAN),
  nom: z.string().trim().max(80).optional(),
  taille: z.number().int().min(0),
  creeLe: horodatage,
});

/** `partagesPlans/{jeton}` : lecture seule, révocable. */
export const partagePlan = z.object({
  proprietaire: z.object({
    type: z.enum(['particulier', 'entreprise']),
    id: z.string().min(1).max(128),
  }),
  planId: z.string().min(1).max(64),
  /** Une version figée, ou toujours la dernière. */
  versionId: z.union([z.string().min(1).max(64), z.literal('courante')]),
  expireLe: horodatage.nullable(),
  revoque: z.boolean(),
});

export type PlanDessin = z.infer<typeof planDessin>;
export type VersionPlan = z.infer<typeof versionPlan>;
export type PartagePlan = z.infer<typeof partagePlan>;
