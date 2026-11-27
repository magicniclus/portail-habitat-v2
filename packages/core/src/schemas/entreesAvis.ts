import { POINTS_POSITIFS, TEXTE_AVIS_MAX, TYPES_TRAVAUX_AVIS } from '../avis';
import { z } from '../zod';
import { email, id, moisIso, note } from './commun';

/**
 * Dépôt d'un avis (`/avis`, AVI-01 à 04) : note et certification obligatoires, 1 200 caractères au
 * plus. Objet strict : le statut, la modération ou la preuve ne viennent jamais du navigateur.
 */
export const entreeAvis = z.strictObject({
  cleIdempotence: z.string().min(8).max(64),
  artisanId: id,
  note,
  criteres: z
    .strictObject({ qualite: note, delais: note, proprete: note, rapportQP: note })
    .partial()
    .default({}),
  pointsPositifs: z.array(z.enum(POINTS_POSITIFS)).max(POINTS_POSITIFS.length).default([]),
  texte: z.string().trim().max(TEXTE_AVIS_MAX).default(''),
  nomAffiche: z.string().trim().min(2).max(60),
  email,
  typeTravaux: z.enum(TYPES_TRAVAUX_AVIS),
  finChantier: moisIso,
  certification: z.literal(true, 'Cochez la certification pour publier votre avis'),
  /** Piège à robots : doit rester vide. */
  site: z.string().max(0).optional(),
});

export type EntreeAvis = z.output<typeof entreeAvis>;
