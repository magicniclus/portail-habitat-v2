import { z } from '../zod';
import { centimesPositifs, codePostal, horodatage, id, meta, schemaVersion } from './commun';

const option = z.object({
  v: z.union([z.string(), z.number()]),
  label: z.string(),
  desc: z.string().optional(),
  coef: z.number().optional(),
});

/** `referentiel/prestations/items/{id}` : PUBLIC, champs et libellés sans aucun prix. */
export const prestationItem = z.object({
  schemaVersion,
  nom: z.string(),
  famille: id,
  pitch: z.string().optional(),
  repere: z.string().optional(),
  icone: z.string().optional(),
  ordre: z.number().int(),
  actif: z.boolean(),
  tva: z.union([z.literal(0.055), z.literal(0.1), z.literal(0.2)]),
  champs: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(['slider', 'stepper', 'options', 'chips']),
      label: z.string(),
      aide: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      pas: z.number().optional(),
      def: z.unknown().optional(),
      unite: z.string().optional(),
      etape: z.number().int().optional(),
      options: z.array(option).optional(),
    }),
  ),
  formule: z.string(),
  version: z.string(),
  updatedAt: horodatage,
});

/** `referentiel/prestations/prix/{id}` : SERVEUR UNIQUEMENT (révélation du prix après envoi). */
export const prestationPrix = z.object({
  schemaVersion,
  parametres: z.record(z.string(), z.unknown()),
  version: z.string(),
  updatedAt: horodatage,
});

export const diagnosticItem = z.object({
  schemaVersion,
  nom: z.string(),
  prixMin: centimesPositifs,
  prixMax: centimesPositifs,
  validiteAns: z.number().nonnegative().nullable(),
  invalideAvantAnnee: z.number().int().optional(),
  quand: z.string(),
  validiteTexte: z.string(),
  note: z.string().optional(),
  regle: z.string(),
  icone: z.string().optional(),
  conseille: z.boolean(),
  version: z.string(),
});

export const metierOuLabel = z.object({
  schemaVersion,
  label: z.string(),
  slug: z.string(),
  icone: z.string().optional(),
  ordre: z.number().int(),
  actif: z.boolean(),
  documentRequis: z.string().optional(),
});

/** `referentiel/recherche/intentions/{id}` (RECHERCHE.md §1). */
export const intentionRecherche = z.object({
  schemaVersion,
  libelle: z.string(),
  metier: id,
  prestation: id,
  motsCles: z.array(z.string()),
  popularite: z.number().int().min(1).max(5),
  actif: z.boolean(),
  saison: z.enum(['printemps', 'ete', 'automne', 'hiver']).optional(),
});

/** `referentiel/recherche/synonymes/global` : un seul document. */
export const synonymesRecherche = z.object({
  schemaVersion,
  equivalences: z.array(z.array(z.string()).min(2)),
  developpements: z.record(z.string(), z.string()),
  motsVides: z.array(z.string()).default([]),
  updatedAt: horodatage,
});

export const metierRecherche = z.object({
  schemaVersion,
  nom: z.string(),
  alias: z.array(z.string()),
  famille: z.string(),
  prestationDefaut: id,
  lienAnnuaire: z.string().optional(),
});

export const commune = z.object({
  schemaVersion,
  nom: z.string(),
  codePostal,
  codeInsee: z.string().regex(/^\d[\dAB]\d{3}$/),
  population: z.number().int().positive(),
  anneePopulation: z.number().int(),
  superficieKm2: z.number().positive(),
  prixM2: centimesPositifs.optional(),
  prixSource: z.string().optional(),
  presquile: z.boolean().default(false),
  intro: z.string(),
  bati: z.string().optional(),
  secteurs: z.array(z.string()).default([]),
  risques: z.array(z.string()).default([]),
  frequents: z.array(z.object({ titre: z.string(), texte: z.string() })).default([]),
  seoTitle: z.string().max(70),
  seoDescription: z.string().max(170),
  publie: z.boolean(),
  updatedAt: horodatage,
});

export const statsPublic = z.object({
  schemaVersion,
  nbArtisans: z.number().int().nonnegative(),
  nbDemandesMois: z.number().int().nonnegative(),
  nbVilles: z.number().int().nonnegative(),
  noteMoyenneGlobale: z.number().min(0).max(5),
  nbAvisTotal: z.number().int().nonnegative(),
  nbDossiersDiag: z.number().int().nonnegative(),
  updatedAt: horodatage,
});

/** `config/app` : lecture publique ; les prix y sont indicatifs (Stripe fait foi). */
export const configApp = z.object({
  schemaVersion,
  prix: z.object({
    premiumMensuelHt: centimesPositifs,
    premiumAnnuelHtMois: centimesPositifs,
    visibiliteAnnuelHt: centimesPositifs,
    visibiliteMensuelHt: centimesPositifs,
  }),
  versionsLegales: z.object({
    cgu: z.string(),
    cgv: z.string(),
    confidentialite: z.string(),
    avis: z.string(),
    charte: z.string(),
  }),
  maintenance: z.boolean(),
  quotas: z.object({ gratuit: z.number().int(), premium: z.number().int() }),
  maxAttributions: z.number().int().min(1).max(3),
  updatedAt: horodatage,
});

/** `config/flags` (et `config/flags/artisans/{artisanId}`) : surcharges des feature flags. */
export const configFlags = z.object({
  schemaVersion,
  valeurs: z.record(z.string(), z.boolean()),
  updatedAt: horodatage,
});

export const annonce = z.object({
  ...meta,
  titre: z.string().max(120),
  texte: z.string().max(600),
  cible: z.enum(['particuliers', 'pros', 'tous']),
  ton: z.enum(['info', 'attention', 'premium']),
  debut: horodatage,
  fin: horodatage.optional(),
  actif: z.boolean(),
});
