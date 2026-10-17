import { LABELS } from './artisans';
import { z } from '../zod';

const TRIS_ANNUAIRE = ['pertinence', 'note', 'proximite', 'delai', 'avis'] as const;
const liste = (valeurs?: readonly string[]) =>
  z
    .string()
    .max(400)
    .transform((s) =>
      [
        ...new Set(
          s
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean),
        ),
      ].slice(0, 12),
    )
    .transform((l) => (valeurs ? l.filter((x) => valeurs.includes(x)) : l));

/**
 * Filtres de l'annuaire lus dans l'URL (ANN-01) : une valeur inconnue ou hors bornes est
 * ignorée (valeur par défaut), jamais une erreur, pour qu'un lien partagé s'ouvre toujours.
 */
export const filtresAnnuaireUrl = z.object({
  q: z.string().trim().max(80).catch('').default(''),
  ville: z.string().trim().max(60).catch('').default(''),
  rayon: z.coerce.number().int().min(5).max(60).multipleOf(5).catch(20).default(20),
  metier: liste().catch([]).default([]),
  note: z.coerce
    .number()
    .pipe(z.union([z.literal(0), z.literal(4), z.literal(4.5), z.literal(4.8)]))
    .catch(0)
    .default(0),
  labels: liste(LABELS).catch([]).default([]),
  dispo: z.enum(['tous', 'semaine', 'quinze']).catch('tous').default('tous'),
  budget: z.enum(['tous', 'petit', 'moyen', 'grand']).catch('tous').default('tous'),
  tri: z.enum(TRIS_ANNUAIRE).catch('pertinence').default('pertinence'),
});

export type FiltresAnnuaireUrl = z.output<typeof filtresAnnuaireUrl>;
