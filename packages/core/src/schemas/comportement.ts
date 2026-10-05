import { z } from '../zod';
import { horodatage, id, jourIso, meta, schemaVersion } from './commun';

/** Collections de COMPORTEMENT.md §5 : écrites par les Functions uniquement. */
export const pageSuivie = z.object({
  ...meta,
  url: z.string(),
  nom: z.string(),
  gabarits: z.array(z.string()).default([]),
  sections: z.array(z.object({ id: z.string(), nom: z.string() })),
  elements: z.array(z.object({ dataPh: z.string(), nom: z.string(), type: z.string() })),
  objectif: z.enum(['inscription', 'demande', 'paiement']),
  actif: z.boolean(),
  echantillon: z.number().min(0).max(1),
  captureUrl: z.string().optional(),
});

const compteurs = z.record(z.string(), z.number());

/** Résumé d'une page vue (`comportementSessions/{vueId}`), écrit par `/api/t` : le dernier envoi l'emporte. */
export const sessionComportement = z.object({
  schemaVersion,
  sessionId: z.string(),
  page: z.string(),
  variante: z.string().optional(),
  app: z.enum(['particulier', 'pro', 'diag']),
  appareil: z.enum(['ordinateur', 'tablette', 'mobile']),
  largeur: z.number().int().positive(),
  hauteur: z.number().int().nonnegative(),
  source: z.string(),
  nouvelle: z.boolean(),
  duree: z.number().nonnegative(),
  profondeur: z.number().min(0).max(100),
  cellulesClics: compteurs,
  cellulesAttention: compteurs,
  sections: compteurs,
  elements: z.record(
    z.string(),
    z.object({ survolMs: z.number(), clics: z.number(), hesitations: z.number().optional() }),
  ),
  morts: z.array(z.string()),
  rages: z.array(z.string()),
  champs: compteurs,
  abandon: z.string().optional(),
  sortie: z.object({ section: z.string(), type: z.string(), intention: z.boolean() }),
  conversion: z.enum(['inscription', 'demande', 'paiement']).optional(),
  trajet: z.array(z.number()).optional(),
  replayPath: z.string().optional(),
  /** Jour de la visite (heure de Paris) : l'agrégation de nuit lit par page et par jour. */
  jour: jourIso,
  createdAt: horodatage,
  expireLe: horodatage,
});

export const agregatComportement = z.object({
  schemaVersion,
  sessions: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  dureeMediane: z.number().nonnegative(),
  profondeurMediane: z.number().nonnegative(),
  grilleClics: z.string(),
  grilleAttention: z.string(),
  grilleMouvements: z.string(),
  scroll: z.array(z.number()).length(20),
  sections: z.record(
    z.string(),
    z.object({
      vues: z.number(),
      tempsMoyen: z.number(),
      sorties: z.number(),
      convSiLue: z.number(),
    }),
  ),
  elements: z.record(z.string(), z.record(z.string(), z.number())),
  sorties: z.array(z.object({ section: z.string(), part: z.number() })),
  sources: compteurs,
  variantes: compteurs,
  updatedAt: horodatage,
});

export const alerteComportement = z.object({
  schemaVersion,
  page: z.string(),
  type: z.enum([
    'clic_mort',
    'rage',
    'hesitation',
    'sortie',
    'baisse_conversion',
    'element_invisible',
  ]),
  element: z.string().optional(),
  gravite: z.number().int().min(1).max(5),
  valeur: z.number(),
  reference: z.number(),
  statut: z.enum(['ouverte', 'traitee', 'ignoree']),
  createdAt: horodatage,
});

export const testAB = z.object({
  ...meta,
  page: z.string(),
  nom: z.string(),
  variantes: z
    .array(z.object({ id: z.string(), poids: z.number().min(0).max(1), description: z.string() }))
    .min(2),
  objectif: z.string(),
  statut: z.enum(['brouillon', 'en_cours', 'termine', 'abandonne']),
  debut: horodatage,
  fin: horodatage.optional(),
  resultat: z.record(z.string(), z.unknown()).optional(),
  creePar: id,
});

export const configComportement = z.object({
  schemaVersion,
  actif: z.boolean(),
  echantillon: z.number().min(0).max(1),
  echantillonReplay: z.number().min(0).max(1),
  seuils: z.record(z.string(), z.number()),
  updatedAt: horodatage,
});
