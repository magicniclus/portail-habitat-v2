import {
  NOMS_FORMATS,
  NOMS_RESEAUX,
  NOMS_SCENES,
  planMontage,
  preparationCaptures,
  type FormatStudio,
  type SceneCapture,
} from '../studio';
import { z } from '../zod';

/** Entrées des Server Actions du Studio (STUDIO.md), vérifiées côté client et serveur. */

const id = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/);
const chemin = z
  .string()
  .regex(
    /^studio\/[A-Za-z0-9_-]{1,128}\/[A-Za-z0-9_-]{1,40}\/[a-z0-9_-]{1,40}\.(webm|mp4|ogg|mov|m4v|mp3|m4a|wav|aac)$/,
  );

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
    // Importée du téléphone : jusqu'à 15 min (l'enregistrement dans le navigateur s'arrête à 8).
    .max(15 * 60_000),
});

export const entreeRetoucheStudio = z.strictObject({
  projetId: id,
  demande: z.string().trim().min(3).max(1_000),
});

export const entreeModifierPlanStudio = z.strictObject({ projetId: id, plan: planMontage });

export const entreeProjetStudio = z.strictObject({ projetId: id });

/** Décliner un sujet en 1 à 5 vidéos d'un coup. */
export const entreeDeclinaisonStudio = z.strictObject({
  projetId: id,
  index: z.number().int().min(0).max(7),
  nombre: z.number().int().min(1).max(5),
});

/** Voix de synthèse ElevenLabs : le texte lu (le script par défaut) et la voix choisie. */
export const entreeVoixSyntheseStudio = z.strictObject({
  projetId: id,
  texte: z.string().trim().min(10).max(5_000),
  voixId: z.string().regex(/^[A-Za-z0-9]{1,64}$/),
  /** Sous-titres voulus par l'auteur (absent : Claude décide). */
  sousTitres: z.boolean().optional(),
});

/** Garder une idée proposée pour la tourner plus tard, sans rappeler l'IA. */
export const entreeGarderIdeeStudio = z.strictObject({
  projetId: id,
  index: z.number().int().min(0).max(7),
});

export const entreeIdeeStudio = z.strictObject({ ideeId: z.string().regex(/^[a-f0-9]{24}$/) });

export const entreeTournerIdeeStudio = z.strictObject({
  ideeId: z.string().regex(/^[a-f0-9]{24}$/),
  format: z.enum(NOMS_FORMATS as [FormatStudio, ...FormatStudio[]]),
  camera: z.boolean(),
});

const reseau = z.enum(NOMS_RESEAUX);

/** Retour d'autorisation d'un réseau (le code OAuth n'est jamais journalisé en clair). */
export const entreeConnexionReseauStudio = z.strictObject({
  reseau,
  code: z.string().min(4).max(2_000),
});

export const entreeReseauStudio = z.strictObject({ reseau });

/** Programmer la vidéo finie (ou une variante) sur un ou plusieurs réseaux. */
export const entreeProgrammerStudio = z.strictObject({
  projetId: id,
  reseaux: z.array(reseau).min(1).max(3),
  /** Heure de publication (ms) ; maintenant = tout de suite. */
  quand: z.number().int().min(0),
  titre: z.string().trim().min(2).max(100),
  texte: z.string().trim().max(2_000),
  hashtags: z
    .array(
      z
        .string()
        .trim()
        .regex(/^#?[\p{L}\p{N}_]{1,50}$/u),
    )
    .max(30),
  variante: id.nullable().optional(),
});

export const entreePublicationStudio = z.strictObject({ publicationId: id });

/** Série d'épisodes : un nom et la promesse tenue à chaque épisode. */
export const entreeCreerSerieStudio = z.strictObject({
  nom: z.string().trim().min(2).max(60),
  promesse: z.string().trim().min(5).max(200),
});

export const entreeEpisodeStudio = z.strictObject({
  serieId: id,
  format: z.enum(NOMS_FORMATS as [FormatStudio, ...FormatStudio[]]),
  camera: z.boolean(),
});

export const entreeSerieStudio = z.strictObject({ serieId: id });

/** Sujets tirés des commentaires : aucune entrée, tout est relu côté serveur. */
export const entreeCommentairesStudio = z.strictObject({});

const compte = z.number().int().min(0).max(1_000_000_000);
/** Chiffres relevés à la main sur l'appli du réseau (en attendant la connexion des comptes). */
const chiffresManuels = {
  vues: compte,
  likes: compte.nullable(),
  commentaires: compte.nullable(),
  partages: compte.nullable(),
  abonnesGagnes: compte.nullable(),
  /** Part de la vidéo regardée en moyenne, en %. */
  retentionPourcent: z.number().int().min(0).max(100).nullable(),
};

export const entreePublicationManuelleStudio = z.strictObject({
  projetId: id,
  reseau,
  variante: id.nullable(),
  /** Heure de publication (ms). */
  publieeLe: z.number().int().min(0),
  lien: z
    .string()
    .trim()
    .url()
    .max(300)
    .regex(/^https:\/\//)
    .nullable(),
  ...chiffresManuels,
});

export const entreeChiffresManuelsStudio = z.strictObject({
  publicationId: id,
  ...chiffresManuels,
});

/** Vidéo sans voix ni image : sa durée (10 s à 3 min) et, au choix, le script en sous-titres. */
export const entreeSansPriseStudio = z.strictObject({
  projetId: id,
  dureeMs: z.number().int().min(10_000).max(180_000),
  sousTitres: z.boolean().optional(),
});

/** Captures avant le montage : artisan d'exemple et écrans corrigés par l'auteur. */
export const entreePreparationStudio = z.strictObject({
  projetId: id,
  preparation: preparationCaptures,
});

/** Filmer les écrans préparés ; `refaire` refilme une seule scène. */
export const entreeFilmerStudio = z.strictObject({
  projetId: id,
  refaire: z.enum(NOMS_SCENES as [SceneCapture, ...SceneCapture[]]).optional(),
});
