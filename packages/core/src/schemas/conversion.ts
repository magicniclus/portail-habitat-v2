import { z } from '../zod';
import {
  centimesPositifs,
  email,
  geo,
  geohash,
  horodatage,
  id,
  jourIso,
  meta,
  pourcent,
  schemaVersion,
  siren,
} from './commun';
import { rayonKm } from './artisans';

export const ETAPES_CYCLE = [
  'prospect',
  'inscription_commencee',
  'compte_cree',
  'fiche_en_ligne',
  'gratuit_actif',
  'visibilite',
  'premium',
  'resiliation_demandee',
  'ancien_client',
] as const;

/** `prospects/{id}` : artisans non inscrits (CONVERSION.md §6). */
export const prospect = z.object({
  ...meta,
  email,
  source: z.enum(['estimation', 'guide', 'salon', 'import', 'facebook']),
  metiers: z.array(id),
  commune: z.string().optional(),
  /** Département du témoignage J+5 (moyenne calculée sur ce département). */
  codePostal: z
    .string()
    .regex(/^\d{5}$/)
    .optional(),
  /** Demandes estimées sur 30 jours à l'inscription (STATS_DEMANDES), reprises à J+5. */
  demandes30j: z.number().int().nonnegative().optional(),
  geo: geo.optional(),
  geohash: geohash.optional(),
  rayonKm: rayonKm.optional(),
  siren: siren.optional(),
  etape: z.string(),
  consentement: z.object({
    base: z.literal('interet_legitime_b2b'),
    date: horodatage,
    texte: z.string(),
  }),
  desabonne: z.boolean(),
  convertiEn: id.optional(),
  expireLe: horodatage,
});

/** `cycleEtat/{artisanId}` : séparé d'artisans/{id} pour ne pas relancer ses déclencheurs. */
export const cycleEtat = z.object({
  schemaVersion,
  etape: z.enum(ETAPES_CYCLE),
  depuis: horodatage,
  offreCible: z.enum(['visibilite', 'premium', 'annuel', 'aucune']),
  score: pourcent,
  groupeTemoin: z.boolean(),
  signaux: z.object({
    vues7j: z.number().int().nonnegative(),
    vues30j: z.number().int().nonnegative(),
    position: z.number().int().positive().nullable(),
    positionPrec: z.number().int().positive().nullable(),
    recherchesSecteur30j: z.number().int().nonnegative(),
    /** Recherches « métier + ville » des 7 derniers jours sans la fiche en 1re page. */
    recherchesManquees7j: z.number().int().nonnegative().optional(),
    demandesExclusivesManquees7j: z.number().int().nonnegative(),
    montantManque7j: centimesPositifs,
    creditsAchetes30j: z.number().int().nonnegative(),
    tempsReponseMoyen: z.number().nonnegative().nullable(),
    derniereConnexion: horodatage.nullable(),
  }),
  sequence: z
    .object({ id, etape: z.number().int().nonnegative(), prochainEnvoi: horodatage.nullable() })
    .nullable(),
  derniereRemise: horodatage.nullable(),
  derniereOffreRetention: horodatage.nullable(),
  /** Dernier code personnel envoyé : repris tel quel par l'email de rappel. */
  codeActif: z
    .object({
      code: z.string(),
      pourcentage: z.number().int().min(1).max(50),
      produit: z.enum(['visibilite', 'premium']),
      expire: horodatage,
      utilise: z.boolean(),
    })
    .optional(),
  /** Demande invendue proposée, valable 48 h ; `demandeOfferteRecue` : une seule fois. */
  demandeOfferte: z.object({ appelOffresId: id, le: horodatage, jusqua: horodatage }).optional(),
  demandeOfferteRecue: z.boolean().optional(),
  emailsNonOuvertsConsecutifs: z.number().int().nonnegative(),
  enVeille: z.boolean(),
  pause: z.object({ par: z.string(), depuis: horodatage, motif: z.string() }).optional(),
  exclu: z.boolean(),
  updatedAt: horodatage,
});

export const traceCycle = z.object({
  schemaVersion,
  artisanId: id.optional(),
  prospectId: id.optional(),
  type: z.string(),
  raison: z.string().optional(),
  sequenceId: id.optional(),
  modele: z.string().optional(),
  variante: z.string().optional(),
  details: z.record(z.string(), z.unknown()).default({}),
  function: z.string(),
  traceId: z.string(),
  createdAt: horodatage,
  expireLe: horodatage,
});

export const statsCycle = z.object({
  schemaVersion,
  jour: jourIso,
  entonnoir: z.record(z.string(), z.number().int().nonnegative()),
  envois: z.record(z.string(), z.number().int().nonnegative()),
  ouvertures: z.record(z.string(), z.number().int().nonnegative()),
  clics: z.record(z.string(), z.number().int().nonnegative()),
  conversions: z.record(z.string(), z.number().int().nonnegative()),
  revenuAttribueCentimes: z.record(z.string(), centimesPositifs),
  temoin: z.object({
    effectif: z.number().int().nonnegative(),
    conversions: z.number().int().nonnegative(),
  }),
});

export const sequence = z.object({
  ...meta,
  nom: z.string(),
  etapeEntree: z.enum(ETAPES_CYCLE),
  objectif: z.string(),
  actif: z.boolean(),
  etapes: z.array(
    z.object({
      modele: z.string(),
      declencheur: z.enum(['immediat', 'delai', 'signal', 'planifie']),
      valeur: z.union([z.string(), z.number()]).optional(),
      ab: z.array(z.string()).optional(),
    }),
  ),
  version: z.number().int().positive(),
  modifiePar: id,
  supprimee: z.boolean().default(false),
  motifSuppression: z.string().optional(),
});

export const configCycle = z.object({
  schemaVersion,
  actif: z.boolean(),
  maxOffresProSemaine: z.number().int().nonnegative(),
  maxNonTransacJour: z.number().int().nonnegative(),
  veilleApres: z.number().int().positive(),
  creneaux: z.array(z.string()),
  remiseBienvenue: z.number().int().min(0).max(30),
  validiteCodeH: z.number().int().positive(),
  delaiEntreRemisesJ: z.number().int().positive(),
  remiseRetention: z.number().int().min(0).max(50),
  seuilPremium: pourcent,
  seuilAppel: pourcent,
  tailleTemoin: z.number().min(0).max(0.5),
  updatedAt: horodatage,
});

/**
 * `recherchesSecteur/{jour}_{metier}_{ville}` : recherches de l'annuaire avec un métier et une
 * ville, et apparitions en 1re page par fiche. Aucune donnée personnelle ; supprimé après 40 jours.
 */
export const rechercheSecteur = z.object({
  schemaVersion,
  jour: jourIso,
  metier: id,
  ville: z.string().min(1).max(80),
  n: z.number().int().nonnegative(),
  premierePage: z.record(z.string(), z.number().int().nonnegative()),
  expireLe: horodatage,
});
