import {
  ACTIONS_REDACTION,
  LIMITES_REDACTION,
  TONS_REDACTION,
  TYPES_REDACTION,
} from '../ia/redaction';
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

/** Assistant de rédaction de Ma Fiche (IA_ADMIN §8) ; l'entreprise vient de la session. */
export const entreeRedactionIa = z
  .strictObject({
    type: z.enum(TYPES_REDACTION),
    action: z.enum(ACTIONS_REDACTION),
    ton: z.enum(TONS_REDACTION).optional(),
    texte: z.string().max(LIMITES_REDACTION.apropos).default(''),
    infos: z
      .strictObject({
        titre: z.string().trim().max(120).optional(),
        ville: z.string().trim().max(80).optional(),
        notes: z.string().trim().max(400).optional(),
      })
      .optional(),
  })
  .refine((e) => e.texte.length <= LIMITES_REDACTION[e.type], {
    message: 'Texte trop long pour l’assistant',
    path: ['texte'],
  })
  .refine((e) => e.action !== 'reecrire' || e.ton, { message: 'Choisissez un ton', path: ['ton'] })
  .refine((e) => e.action === 'generer' || e.texte.trim().length > 0, {
    message: 'Écrivez d’abord un texte',
    path: ['texte'],
  });
export type EntreeRedactionIa = z.infer<typeof entreeRedactionIa>;

/** « Remplacer mon texte » : mesure du taux d'acceptation (le texte n'est jamais stocké). */
export const entreeRedactionAcceptee = z.strictObject({ redactionId: z.string().min(1).max(64) });

/** Réglages de l'assistant (permission `ia.configurer`) ; budget en centimes entiers. */
export const entreeReglagesIa = z.strictObject({
  actif: z.boolean(),
  analyseHebdo: z.boolean(),
  quotaJour: z.number().int().min(1).max(200),
  budgetMensuelCentimes: z.number().int().min(0).max(100_000),
  /** Consignes apprises conservées (les autres sont retirées). */
  consignes: z.array(z.string().trim().min(1).max(300)).max(50),
});
