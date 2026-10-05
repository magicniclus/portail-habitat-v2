import { MODES_IA, PERIMETRES_IA } from '../ia/sortie';
import { z } from '../zod';

/** Admin › Assistant IA (IA_ADMIN §3 et §5). */
export const entreeAnalyseIa = z.strictObject({
  mode: z.enum(MODES_IA),
  /** Vide : toutes les données. */
  perimetres: z.array(z.enum(PERIMETRES_IA)).max(PERIMETRES_IA.length).default([]),
  question: z.string().trim().max(1000).optional(),
  approfondie: z.boolean().default(false),
  /** « Relancer » : ignore le résultat déjà calculé dans les 24 h. */
  relancer: z.boolean().default(false),
});
export type EntreeAnalyseIa = z.infer<typeof entreeAnalyseIa>;

export const entreeActionRecommandation = z.discriminatedUnion('action', [
  z.strictObject({ id: z.string().min(1).max(64), action: z.enum(['tache', 'ab_test', 'faite']) }),
  z.strictObject({
    id: z.string().min(1).max(64),
    action: z.literal('ignorer'),
    motif: z.string().trim().min(3).max(300),
  }),
]);
