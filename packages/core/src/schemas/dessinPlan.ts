import { z } from '../zod';
import { horodatage, schemaVersion } from './commun';

/** Métadonnées d'un plan (DESSIN.md §4) : `users/{uid}/plans/{id}` ou `artisans/{id}/plans/{id}`. */
export const planDessin = z.object({
  schemaVersion,
  titre: z.string().trim().min(1).max(120),
  vignettePath: z.string().max(300).optional(),
  /** Aperçu de « Mes plans » : chemin SVG des murs (`apercuPlan`), calculé par le serveur. */
  apercu: z.string().max(4_000).optional(),
  /** Révision de la scène courante : +1 à chaque enregistrement (contrôle des conflits). */
  versionCourante: z.number().int().min(0),
  /** Scène courante (gzip) dans Storage ; lue et écrite par le serveur uniquement. */
  storagePath: z.string().min(1).max(300),
  /** Dernière version gardée dans l'historique (automatique toutes les 10 min d'édition). */
  derniereVersionLe: horodatage.nullable(),
  /** La scène courante est aussi une version de l'historique : son fichier est partagé. */
  courantDansHistorique: z.boolean(),
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

const TYPES_VERSION_PLAN = ['auto', 'manuelle', 'restauration'] as const;

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

/** Entrées des actions serveur de Dessin (validées côté client ET serveur). */
const idPlan = z.string().regex(/^[A-Za-z0-9]{20}$/, 'Plan inconnu');
const titrePlan = z.string().trim().min(1).max(120);

export const entreeCreerPlan = z.object({
  titre: titrePlan,
  /** Scène de départ (forme, modèle, essai sans compte) ; validée par `migrerScene`. */
  scene: z.unknown().optional(),
});
export const entreeEnregistrerPlan = z.object({
  planId: idPlan,
  /** Révision lue par l'éditeur : un autre onglet a-t-il enregistré entre-temps ? */
  versionAttendue: z.number().int().min(0),
  scene: z.unknown(),
  /** Version nommée à garder dans l'historique (DES-40). */
  nomVersion: z.string().trim().min(1).max(80).optional(),
});
export const entreePlan = z.object({ planId: idPlan });
export const entreeRenommerPlan = z.object({ planId: idPlan, titre: titrePlan });
/** Aperçu d'une version (DES-40). */
export const entreeVersionPlan = z.object({ planId: idPlan, numero: z.number().int().min(1) });
export const entreeRestaurerVersion = z.object({
  planId: idPlan,
  numero: z.number().int().min(1),
  versionAttendue: z.number().int().min(0),
});
export const entreePartagerPlan = z.object({
  planId: idPlan,
  /** Durée du lien en jours : toujours une date de fin (1 an au plus). */
  joursValidite: z.number().int().min(1).max(365).default(30),
});
/** Révocation d'un lien, désigné par l'empreinte de son jeton (jamais par le jeton). */
export const entreeRevoquerPartage = z.object({
  partageId: z.string().regex(/^[0-9a-f]{64}$/, 'Lien inconnu'),
});
export const entreeJetonPartage = z.object({
  jeton: z.string().regex(/^[A-Za-z0-9_-]{32}$/, 'Lien invalide'),
});

/** Plan importé (D91) : image réduite dans le navigateur, envoyée en base64 (3 Mo au plus). */
const TYPES_IMAGE_FOND = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const entreeFondPlan = z.object({
  planId: idPlan,
  type: z.enum(TYPES_IMAGE_FOND),
  base64: z
    .string()
    .max(4 * 1024 * 1024)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Image illisible'),
});
export const entreeLireFond = z.object({ planId: idPlan, storagePath: z.string().min(1).max(300) });
/** Photo HD de la galerie (DES-37), en JPEG. */
export const entreePhotoPlan = z.object({
  planId: idPlan,
  base64: z
    .string()
    .max(4 * 1024 * 1024)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Image illisible'),
});
/** PDF à l'échelle (DES-41) : niveau, échelle, format, postes du métré décochés. */
export const entreePdfPlan = z.object({
  planId: idPlan,
  niveauId: z.string().min(1).max(40),
  echelle: z.union([z.literal(50), z.literal(100)]),
  format: z.enum(['A4', 'A3']),
  exclus: z.array(z.string().max(120)).max(100).default([]),
  /** Scène affichée (pas encore enregistrée peut-être) ; validée par `migrerScene`. */
  scene: z.unknown(),
});
const HORS_METROPOLE = 'L’implantation couvre la France métropolitaine.';
/** Implantation (DES-35) : adresse saisie, puis parcelle sous le point choisi (métropole). */
export const entreeAdresse = z.object({ texte: z.string().trim().min(3).max(200) });
export const entreeParcelle = z.object({
  planId: idPlan,
  lon: z.number().min(-5.5, HORS_METROPOLE).max(10, HORS_METROPOLE),
  lat: z.number().min(41, HORS_METROPOLE).max(51.5, HORS_METROPOLE),
});
export const entreeSupprimerPhoto = z.object({
  planId: idPlan,
  storagePath: z.string().min(1).max(300),
});
