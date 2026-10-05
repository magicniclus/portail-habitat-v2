import { REPLAY_EVENEMENTS_MAX, TRAJET } from '../comportement/mesure';
import { z } from '../zod';

/**
 * Résumé d'une page vue envoyé par le traceur à `/api/t` (COMPORTEMENT §2 et §3).
 * Strict et borné : la route est publique, chaque champ a une taille maximale.
 * Aucune valeur saisie, aucun texte de la page, aucun identifiant personnel.
 */
const cle = z.string().regex(/^[a-z0-9][a-z0-9_:.>-]{0,59}$/i);
const ms = z.number().int().min(0).max(86_400_000);
const compteur = z.number().int().min(0).max(1_000_000);
const carte = (max: number) =>
  z
    .record(z.string().regex(/^\d{1,3}:\d{1,4}$/), compteur)
    .refine((c) => Object.keys(c).length <= max, {
      message: 'Trop de cellules',
    });
const dictionnaire = <T extends z.ZodType>(valeur: T, max: number) =>
  z.record(cle, valeur).refine((d) => Object.keys(d).length <= max, { message: 'Trop d’entrées' });

export const TYPES_SORTIE = ['fermeture', 'navigation', 'lien_externe', 'conversion'] as const;

export const entreeResumeVisite = z.strictObject({
  v: z.literal(1),
  sessionId: z.string().regex(/^[a-z0-9]{16}$/),
  vueId: z.string().regex(/^[a-z0-9]{16}$/),
  page: z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/),
  variante: z
    .string()
    .regex(/^[A-Z0-9]{1,3}$/)
    .optional(),
  app: z.enum(['particulier', 'pro', 'diag']),
  appareil: z.enum(['ordinateur', 'tablette', 'mobile']),
  largeur: z.number().int().min(200).max(10_000),
  hauteur: z.number().int().min(0).max(200_000),
  source: z.string().regex(/^[a-z0-9._-]{1,60}$/),
  nouvelle: z.boolean(),
  duree: ms,
  profondeur: z.number().int().min(0).max(100).multipleOf(5),
  cellulesClics: carte(400),
  cellulesAttention: carte(400),
  sections: dictionnaire(ms, 40),
  elements: dictionnaire(
    z.strictObject({ survolMs: ms, clics: compteur, hesitations: compteur.optional() }),
    80,
  ),
  morts: z.array(cle).max(50),
  rages: z.array(cle).max(20),
  champs: dictionnaire(ms, 40),
  abandon: cle.optional(),
  sortie: z.strictObject({
    section: z.union([cle, z.literal('')]),
    type: z.enum(TYPES_SORTIE),
    intention: z.boolean(),
  }),
  conversion: z.enum(['inscription', 'demande', 'paiement']).optional(),
  trajet: z
    .array(z.number().int().min(0).max(200_000))
    .max(TRAJET.pointsMax * 2)
    .optional(),
  replay: z
    .array(
      z.tuple([
        z.number().int().min(0),
        z.number().int().min(0).max(2),
        z.number().int(),
        z.number().int(),
      ]),
    )
    .max(REPLAY_EVENEMENTS_MAX)
    .optional(),
});
export type ResumeVisite = z.infer<typeof entreeResumeVisite>;
