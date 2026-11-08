import { z } from '../zod';
import {
  APPAREILS,
  ENTREES,
  NOMS_SCENES,
  PLACEMENTS_CAMERA,
  POSITIONS,
  STYLES_TEXTE,
  VISUELS,
  type SceneCapture,
} from './catalogue';
import { NOMS_FORMATS, type FormatStudio } from './formats';

/**
 * Plan de montage (STUDIO.md §5) : la SEULE chose que Claude produit pour le montage. Il est
 * validé ici puis par `verifierPlan` ; l'aperçu et le rendu le lisent tous deux. Aucun code, aucun
 * HTML : uniquement des plans pris dans la prise, des captures du catalogue et des calques.
 * Temps en millisecondes entières.
 */

const ms = z.number().int().min(0).max(3_600_000);
const fraction = z.number().min(0).max(1);
const texteCourt = z.string().trim().min(1).max(80);

/** Entrée animée d'un élément (absente : l'animation propre à l'élément). */
const entree = z.enum(ENTREES).optional();
const temps = { debut: ms, fin: ms, entree };

const calqueTexte = z.strictObject({
  type: z.literal('texte'),
  texte: texteCourt,
  style: z.enum(STYLES_TEXTE),
  position: z.enum(POSITIONS),
  ...temps,
});
const calqueCompteur = z.strictObject({
  type: z.literal('compteur'),
  de: z.number().int().min(0).max(100_000_000),
  a: z.number().int().min(0).max(100_000_000),
  /** Montant : `de` et `a` sont en centimes, affichés en euros. */
  euros: z.boolean().optional(),
  libelle: texteCourt,
  position: z.enum(POSITIONS),
  ...temps,
});
const calqueNotification = z.strictObject({
  type: z.literal('notification'),
  titre: texteCourt,
  texte: z.string().trim().min(1).max(120),
  ...temps,
});
const calqueListe = z.strictObject({
  type: z.literal('liste'),
  elements: z.array(texteCourt).min(1).max(5),
  position: z.enum(POSITIONS),
  ...temps,
});
const calqueBarre = z.strictObject({
  type: z.literal('barre'),
  libelle: texteCourt,
  valeur: z.number().int().min(0).max(100),
  position: z.enum(POSITIONS),
  ...temps,
});
/** Flèche et surlignage : coordonnées en fraction du visuel principal (0 à 1). */
const calqueFleche = z.strictObject({
  type: z.literal('fleche'),
  x: fraction,
  y: fraction,
  ...temps,
});
const calqueSurlignage = z.strictObject({
  type: z.literal('surlignage'),
  x: fraction,
  y: fraction,
  largeur: fraction,
  hauteur: fraction,
  ...temps,
});

/** Scènes animées (comme les films de présentation) : demandes qui arrivent, outils, tampon… */
const calqueDemandes = z.strictObject({
  type: z.literal('demandes'),
  elements: z
    .array(z.strictObject({ titre: texteCourt, ville: texteCourt }))
    .min(1)
    .max(4),
  position: z.enum(POSITIONS),
  ...temps,
});
const calqueOutils = z.strictObject({
  type: z.literal('outils'),
  elements: z.array(texteCourt).min(2).max(6),
  position: z.enum(POSITIONS),
  ...temps,
});
const calqueTampon = z.strictObject({
  type: z.literal('tampon'),
  texte: z.string().trim().min(1).max(40),
  position: z.enum(POSITIONS),
  ...temps,
});
const calqueComparaison = z.strictObject({
  type: z.literal('comparaison'),
  avant: texteCourt,
  apres: texteCourt,
  ...temps,
});
const calqueFin = z.strictObject({
  type: z.literal('fin'),
  titre: texteCourt,
  bouton: z.string().trim().min(1).max(40),
  ...temps,
});

export const calque = z.discriminatedUnion('type', [
  calqueTexte,
  calqueCompteur,
  calqueNotification,
  calqueListe,
  calqueBarre,
  calqueFleche,
  calqueSurlignage,
  calqueDemandes,
  calqueOutils,
  calqueTampon,
  calqueComparaison,
  calqueFin,
]);
export type Calque = z.infer<typeof calque>;

export const planVideo = z.strictObject({
  id: z.string().regex(/^[a-z0-9_-]{1,24}$/),
  /** Passage de la prise (voix et images) gardé pour ce plan. */
  source: z.strictObject(temps),
  visuel: z.enum(VISUELS),
  captureId: z
    .string()
    .regex(/^[a-z0-9_-]{1,24}$/)
    .optional(),
  camera: z.enum(PLACEMENTS_CAMERA),
  /** Capture ou écran posé dans un ordinateur ou un téléphone, sur fond animé. */
  appareil: z.enum(APPAREILS).optional(),
  /** Zone de l'écran agrandie (fractions), pour montrer un détail. */
  zoom: z.strictObject({ x: fraction, y: fraction, largeur: fraction }).optional(),
  /** Texte du carton (visuel « carton »). */
  carton: z.string().trim().min(1).max(80).optional(),
  calques: z.array(calque).max(8),
});
export type PlanVideo = z.infer<typeof planVideo>;

export const capture = z.strictObject({
  id: z.string().regex(/^[a-z0-9_-]{1,24}$/),
  scene: z.enum(NOMS_SCENES as [SceneCapture, ...SceneCapture[]]),
});
export type CaptureDemandee = z.infer<typeof capture>;

/**
 * Artisan fictif filmé par le robot (sur une copie isolée du site, jamais sur le vrai annuaire).
 * Montants en centimes entiers.
 */
export const artisanFictif = z.strictObject({
  nom: z.string().trim().min(2).max(60),
  metier: z.string().trim().min(2).max(40),
  ville: z.string().trim().min(2).max(60),
  demandesParMois: z.number().int().min(0).max(10_000).optional(),
  chiffreAffairesCentimes: z.number().int().min(0).max(100_000_000_00).optional(),
  devisEnvoyes: z.number().int().min(0).max(10_000).optional(),
  noteMoyenne: z.number().min(1).max(5).optional(),
  nombreAvis: z.number().int().min(0).max(10_000).optional(),
});
export type ArtisanFictif = z.infer<typeof artisanFictif>;

export const planMontage = z.strictObject({
  format: z.enum(NOMS_FORMATS as [FormatStudio, ...FormatStudio[]]),
  titre: z.string().trim().min(1).max(100),
  plans: z.array(planVideo).min(1).max(80),
  captures: z.array(capture).max(12),
  artisan: artisanFictif.nullable(),
  /** Sous-titres mot à mot, incrustés. */
  sousTitres: z.boolean(),
  /** Fond musical discret sous la voix. */
  musique: z.boolean(),
  /**
   * Autres accroches à tester (A/B) : chacune change le texte de la première image (et la
   * miniature) ; le robot rend une vidéo par variante, on garde celle qui marche.
   */
  variantes: z
    .array(
      z.strictObject({
        id: z.string().regex(/^[a-z0-9_-]{1,24}$/),
        accroche: texteCourt,
        miniature: z
          .strictObject({
            texte: z.string().trim().min(1).max(40),
            accent: z.string().trim().max(20),
          })
          .optional(),
      }),
    )
    .max(3)
    .optional(),
  /** Miniature (image de couverture) : image de la vidéo à `tempsMs`, texte court, mot en avant. */
  miniature: z
    .strictObject({
      texte: z.string().trim().min(1).max(40),
      accent: z.string().trim().max(20),
      tempsMs: ms,
    })
    .optional(),
});
export type PlanMontage = z.infer<typeof planMontage>;

/** Mot de la transcription (Whisper), en millisecondes. */
export interface MotTranscrit {
  texte: string;
  debut: number;
  fin: number;
}
