import { NOMS_FORMATS, planMontage, PRISE_MAX_MS, type FormatStudio } from '../studio';
import { z } from '../zod';

/** Entrées des Server Actions du Studio (STUDIO.md), vérifiées côté client et serveur. */

const id = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/);
const chemin = z
  .string()
  .regex(/^studio\/[A-Za-z0-9_-]{1,128}\/[A-Za-z0-9_-]{1,40}\/[a-z0-9_-]{1,40}\.(webm|mp4|ogg)$/);

/** Sans titre ni idée : Claude cherche lui-même les meilleures vidéos à faire. */
export const entreeCreerProjetStudio = z.strictObject({
  titre: z.string().trim().min(2).max(100).optional(),
  format: z.enum(NOMS_FORMATS as [FormatStudio, ...FormatStudio[]]),
  camera: z.boolean(),
  theme: z.string().trim().max(200).optional(),
});

export const entreeSujetsStudio = z.strictObject({
  projetId: id,
  theme: z.string().trim().max(200).optional(),
});

export const entreeChoixSujetStudio = z.strictObject({
  projetId: id,
  index: z.number().int().min(0).max(7).nullable(),
});

export const entreePriseStudio = z.strictObject({
  projetId: id,
  priseId: id,
  fichiers: z.strictObject({ ecran: chemin.optional(), camera: chemin.optional(), voix: chemin }),
  dureeMs: z
    .number()
    .int()
    .min(1_000)
    .max(PRISE_MAX_MS + 5_000),
});

export const entreeRetoucheStudio = z.strictObject({
  projetId: id,
  demande: z.string().trim().min(3).max(1_000),
});

export const entreeModifierPlanStudio = z.strictObject({ projetId: id, plan: planMontage });

export const entreeProjetStudio = z.strictObject({ projetId: id });

/** Décliner un sujet en 2 à 5 vidéos d'un coup. */
export const entreeDeclinaisonStudio = z.strictObject({
  projetId: id,
  index: z.number().int().min(0).max(7),
  nombre: z.number().int().min(2).max(5),
});
