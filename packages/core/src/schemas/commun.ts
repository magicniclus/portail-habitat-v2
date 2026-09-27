import { estSirenValide, estSiretValide } from '../format/siren';
import { z } from '../zod';

/** Version du schéma écrite sur chaque document (EXPLOITATION.md §2). */
export const SCHEMA_VERSION = 1;
export const schemaVersion = z.literal(SCHEMA_VERSION);

/** Dates : `Date` en mémoire, `Timestamp` en base (conversion par @ph/firebase). */
export const horodatage = z.date();

/** Montants : centimes entiers, jamais de flottant (règle n° 1). */
export const centimes = z.number().int().safe();
export const centimesPositifs = centimes.nonnegative();

export const geo = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export const geohash = z.string().regex(/^[0-9b-hjkmnp-z]{1,12}$/, 'Geohash invalide');
export const codePostal = z.string().regex(/^\d{5}$/, 'Code postal à 5 chiffres');
export const telephoneE164 = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Téléphone au format international');
export const email = z.email().transform((e) => e.toLowerCase());
export const siren = z.string().refine(estSirenValide, 'SIREN invalide');
export const siret = z.string().refine(estSiretValide, 'SIRET invalide');
/** Empreinte SHA-256 en hexadécimal (IP, jetons, emails) : jamais la donnée en clair. */
export const empreinte = z.string().regex(/^[0-9a-f]{16,64}$/, 'Empreinte hexadécimale attendue');
export const moisIso = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mois AAAA-MM');
export const jourIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Jour AAAA-MM-JJ');
export const note = z.number().int().min(1).max(5);
export const ratio = z.number().min(0).max(1);
export const pourcent = z.number().min(0).max(100);
export const id = z.string().min(1).max(128);

export const adresse = z.object({
  ligne1: z.string().min(1),
  ligne2: z.string().optional(),
  codePostal,
  ville: z.string().min(1),
  pays: z.literal('FR').default('FR'),
  geo: geo.optional(),
  geohash: geohash.optional(),
});

/** Champs communs : version, création, mise à jour, suppression logique. */
export const meta = {
  schemaVersion,
  createdAt: horodatage,
  updatedAt: horodatage.optional(),
  deletedAt: horodatage.optional(),
};
