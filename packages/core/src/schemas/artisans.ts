import { ROLES_MEMBRE } from '../equipe/permissions';
import { z } from '../zod';
import {
  adresse,
  centimesPositifs,
  email,
  geo,
  geohash,
  horodatage,
  id,
  meta,
  moisIso,
  pourcent,
  ratio,
  schemaVersion,
  siren,
  siret,
  telephoneE164,
} from './commun';

export const LABELS = [
  'decennale',
  'rge',
  'qualibat',
  'local',
  'rapide',
  'recommande',
  'photos',
  'devis48',
] as const;
export const PLANS = ['gratuit', 'visibilite', 'premium'] as const;

const assurance = z.object({
  assureur: z.string(),
  numeroPolice: z.string(),
  debut: horodatage,
  fin: horodatage,
  activitesCouvertes: z.array(z.string()),
  docId: id,
});

/** Rayon de transmission des demandes : 10 à 100 km (DECISIONS D31c, CGV Pro §1 bis). */
export const rayonKm = z.number().int().min(10).max(100);

/** `artisans/{artisanId}` : entreprise, privée (membres et admins). */
export const artisan = z
  .object({
    ...meta,
    raisonSociale: z.string().min(1),
    nomCommercial: z.string().min(1).max(120),
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    siren,
    siret,
    formeJuridique: z.string().optional(),
    tvaIntra: z.string().optional(),
    codeNaf: z.string().optional(),
    dateCreationEntreprise: horodatage.optional(),
    adresseSiege: adresse,
    telephonePublic: telephoneE164.optional(),
    emailContact: email.optional(),
    siteWeb: z.url().optional(),
    metiers: z.array(id).min(1),
    metierPrincipal: id,
    intentions: z.array(id).default([]),
    tags: z.array(z.string().max(40)).max(30).default([]),
    pitch: z.string().max(280).default(''),
    description: z.string().max(3000).default(''),
    logoUrl: z.string().optional(),
    labels: z.array(z.enum(LABELS)).default([]),
    labelsVerifies: z
      .record(
        z.string(),
        z.object({ verifieLe: horodatage, expireLe: horodatage.optional(), docId: id }),
      )
      .default({}),
    zoneIntervention: z.object({
      centre: geo,
      geohash,
      rayonKm,
      communes: z.array(z.string()).default([]),
      rayonAccepteLe: horodatage,
    }),
    source: z.enum(['direct', 'facebook', 'prospect', 'admin']),
    rge: z
      .object({
        verifie: z.boolean(),
        domaines: z.array(z.string()),
        expireLe: horodatage.optional(),
      })
      .optional(),
    demandeOfferteUtilisee: z.boolean().default(false),
    budgetMin: centimesPositifs.optional(),
    budgetMax: centimesPositifs.optional(),
    budgetCle: z.enum(['petit', 'moyen', 'grand']).optional(),
    delaiDispoJours: z.number().int().nonnegative().optional(),
    plan: z.enum(PLANS),
    planPeriode: z.enum(['mensuel', 'annuel']).optional(),
    planExpireLe: horodatage.optional(),
    optionVisibilite: z.boolean(),
    optionVisibiliteExpireLe: horodatage.optional(),
    verification: z.object({
      statut: z.enum(['a_faire', 'en_cours', 'verifie', 'refuse', 'expire']),
      verifieLe: horodatage.optional(),
      verifiePar: id.optional(),
      motifRefus: z.string().optional(),
    }),
    assuranceDecennale: assurance.optional(),
    assuranceRcPro: assurance.optional(),
    noteMoyenne: z.number().min(0).max(5).default(0),
    nbAvis: z.number().int().nonnegative().default(0),
    notesCriteres: z
      .object({
        qualite: z.number(),
        delais: z.number(),
        proprete: z.number(),
        rapportQP: z.number(),
      })
      .partial()
      .default({}),
    tauxRecommandation: ratio.optional(),
    tempsReponseMoyenMin: z.number().nonnegative().optional(),
    tauxReponse: ratio.optional(),
    quotaDemandesMois: z.number().int().nonnegative(),
    demandesRecuesMois: z.number().int().nonnegative().default(0),
    completude: pourcent.default(0),
    enLigne: z.boolean(),
    avertissements: z.number().int().nonnegative().default(0),
    statut: z.enum(['actif', 'suspendu', 'dereference', 'supprime']),
    onboarding: z.object({
      etape: z.number().int().min(1).max(3),
      termineLe: horodatage.optional(),
    }),
    /** 0 pour une fiche créée par l'admin et non revendiquée (COMPTES §3.5). */
    nbMembres: z.number().int().min(0),
    siegesMax: z.number().int().min(1),
    proprietaireUid: id.optional(),
    origine: z.enum(['onboarding', 'admin', 'import']),
    revendiquee: z.boolean().default(false),
  })
  .refine(
    (a) => a.budgetMin === undefined || a.budgetMax === undefined || a.budgetMin <= a.budgetMax,
    {
      message: 'Budget minimum supérieur au maximum',
      path: ['budgetMin'],
    },
  )
  .refine((a) => !a.revendiquee || a.proprietaireUid !== undefined, {
    message: 'Une entreprise revendiquée a un propriétaire',
    path: ['proprietaireUid'],
  })
  .refine((a) => a.optionVisibilite || a.plan === 'gratuit', {
    message: 'Visibilité incluse dans Visibilité et Premium',
    path: ['optionVisibilite'],
  });

/** `artisans/{id}/prive/facturation` : serveur uniquement. */
export const facturationPrivee = z.object({
  schemaVersion,
  stripeCustomerId: z.string().startsWith('cus_'),
  stripeSubscriptionId: z.string().optional(),
  stripeVisibiliteSubscriptionId: z.string().optional(),
  adresseFacturation: adresse.optional(),
  emailFacturation: email.optional(),
  defaultPaymentMethodLast4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  defaultPaymentMethodBrand: z.string().optional(),
  updatedAt: horodatage,
});

/** `artisans/{id}/membres/{uid}` (COMPTES §1). */
export const membre = z.object({
  schemaVersion,
  role: z.enum(ROLES_MEMBRE),
  permissions: z.array(z.string()).optional(),
  statut: z.enum(['actif', 'suspendu']),
  notifs: z.object({ demandes: z.boolean(), avis: z.boolean(), factures: z.boolean() }),
  metiers: z.array(id).optional(),
  plafondCreditsMois: z.number().int().nonnegative().optional(),
  ajouteLe: horodatage,
  ajoutePar: id,
  invitationId: id.optional(),
  derniereActivite: horodatage.optional(),
});

export const etablissement = z.object({
  ...meta,
  siret,
  adresse,
  zoneIntervention: z.object({ centre: geo, geohash, rayonKm }),
  telephone: telephoneE164.optional(),
});

export const TYPES_DOCUMENT = [
  'kbis',
  'decennale',
  'rc_pro',
  'rge',
  'qualibat',
  'piece_identite',
  'urssaf_vigilance',
] as const;

export const documentArtisan = z.object({
  schemaVersion,
  type: z.enum(TYPES_DOCUMENT),
  storagePath: z.string().regex(/^artisans\/[^/]+\/documents\/[^/]+\/[^/]+$/),
  nomFichier: z.string().max(200),
  mime: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  tailleOctets: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  statut: z.enum(['en_attente', 'valide', 'refuse', 'expire']),
  valideDu: horodatage.optional(),
  valideAu: horodatage.optional(),
  motifRefus: z.string().optional(),
  verifiePar: id.optional(),
  verifieLe: horodatage.optional(),
  createdAt: horodatage,
});

/** Réalisation : publiable seulement avec l'autorisation du propriétaire du chantier (CGV §9). */
export const realisation = z
  .object({
    ...meta,
    titre: z.string().min(2).max(120),
    description: z.string().max(2000).default(''),
    metier: id,
    ville: z.string(),
    budget: centimesPositifs.optional(),
    photos: z
      .array(
        z.object({
          url: z.string(),
          storagePath: z.string(),
          largeur: z.number().int(),
          hauteur: z.number().int(),
        }),
      )
      .max(20),
    autorisationProprietaire: z.boolean(),
    publie: z.boolean(),
    ordre: z.number().int(),
  })
  .refine((r) => !r.publie || r.autorisationProprietaire, {
    message: 'Autorisation du propriétaire requise pour publier',
    path: ['publie'],
  });

export const statsJour = z.object({
  schemaVersion,
  vuesFiche: z.number().int().nonnegative(),
  vuesAnnuaire: z.number().int().nonnegative(),
  clicsTelephone: z.number().int().nonnegative(),
  clicsDevis: z.number().int().nonnegative(),
  demandesRecues: z.number().int().nonnegative(),
  demandesRepondues: z.number().int().nonnegative(),
  devisEnvoyes: z.number().int().nonnegative(),
  devisAcceptes: z.number().int().nonnegative(),
  sources: z.object({
    annuaire: z.number(),
    recherche: z.number(),
    direct: z.number(),
    diagnostic: z.number(),
  }),
});

/**
 * `artisansPublic/{id}` : projection PUBLIQUE. Aucune donnée personnelle (règle n° 8) :
 * le schéma est strict, un champ en trop fait échouer l'écriture.
 */
export const artisanPublic = z
  .object({
    schemaVersion,
    slug: z.string(),
    nomCommercial: z.string(),
    metiers: z.array(id),
    metierPrincipal: id,
    intentions: z.array(id).default([]),
    tags: z.array(z.string()),
    pitch: z.string(),
    description: z.string(),
    logoUrl: z.string().optional(),
    ville: z.string(),
    geo,
    geohash,
    rayonKm,
    labels: z.array(z.enum(LABELS)),
    noteMoyenne: z.number().min(0).max(5),
    nbAvis: z.number().int().nonnegative(),
    notesCriteres: z
      .object({
        qualite: z.number(),
        delais: z.number(),
        proprete: z.number(),
        rapportQP: z.number(),
      })
      .partial(),
    anneesActivite: z.number().int().nonnegative().optional(),
    budgetMin: centimesPositifs.optional(),
    budgetMax: centimesPositifs.optional(),
    budgetCle: z.enum(['petit', 'moyen', 'grand']).optional(),
    delaiDispoJours: z.number().int().nonnegative().optional(),
    dispoLabel: z.string().optional(),
    premium: z.boolean(),
    argumentPremium: z.string().max(140).optional(),
    telephone: telephoneE164.nullable(),
    scoreClassement: z.number(),
    enLigne: z.boolean(),
    updatedAt: horodatage,
  })
  .strict();

export const artisanScore = z.object({
  schemaVersion,
  qualite: pourcent,
  reactivite: pourcent,
  capacite: pourcent,
  equite: pourcent.optional(),
  calculeLe: horodatage,
});

export const sanction = z.object({
  ...meta,
  artisanId: id,
  type: z.enum(['rappel', 'avertissement', 'suspension', 'dereferencement']),
  motif: z.string().min(3),
  refs: z.array(z.string()).default([]),
  debut: horodatage,
  fin: horodatage.optional(),
  parUid: id,
  leveeLe: horodatage.optional(),
});

export const noteInterne = z.object({
  ...meta,
  cible: z.string().regex(/^(artisans|demandes|users)\/[^/]+$/),
  texte: z.string().min(1).max(4000),
  parUid: id,
  epingle: z.boolean().default(false),
});

export const disponibilite = z.object({
  schemaVersion,
  mois: moisIso,
  joursLibres: z.array(z.number().int().min(1).max(31)),
});
