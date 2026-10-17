import { z } from '../zod';
import {
  centimesPositifs,
  codePostal,
  email,
  empreinte,
  horodatage,
  id,
  meta,
  schemaVersion,
} from './commun';

/** `sourcesDemandes/{id}` : site partenaire (DATABASE §4 bis). La clé API reste dans Secret Manager. */
export const sourceDemandes = z.object({
  ...meta,
  nom: z.string(),
  actif: z.boolean(),
  cleApiHash: empreinte,
  ipAutorisees: z.array(z.string()),
  coutUnitaireCentimes: centimesPositifs,
  mappingPrestations: z.record(z.string(), id),
  texteConsentementAttendu: z.string(),
  /** Version convenue du texte de la case (`consentement.versionTexte`, ex. « v3-2026-06 »). */
  versionConsentement: z.string().min(1),
  quotaJour: z.number().int().positive(),
  /** Zone couverte : départements (« 33 », « 2A », « 971 ») ; vide = toute la France. */
  departementsCouverts: z.array(z.string().regex(/^(\d{2,3}|2[AB])$/)).default([]),
});

/** `importsDemandes/{id}` : journal, sans aucune donnée personnelle. TTL 13 mois. */
export const importDemande = z.object({
  schemaVersion,
  sourceId: id,
  idExterne: z.string().min(1).max(128),
  recueLe: horodatage,
  statut: z.enum(['creee', 'doublon', 'rejetee']),
  motifRejet: z
    .enum([
      'consentement_absent',
      'telephone_invalide',
      'hors_zone_couverte',
      'doublon_30j',
      'schema_invalide',
    ])
    .optional(),
  /** Chemins des champs en cause (jamais leur valeur) : visible dans l'admin (IMP-02). */
  details: z.string().max(300).optional(),
  demandeId: id.optional(),
  payloadHash: empreinte,
  traiteLe: horodatage,
  expireLe: horodatage,
});

/** `preuvesConsentement/{id}` : ajout seul, jamais modifié. */
export const preuveConsentement = z.object({
  schemaVersion,
  sourceId: id,
  idExterne: z.string(),
  texteAffiche: z.string().min(10),
  versionTexte: z.string(),
  coche: z.literal(true),
  horodatage,
  urlPage: z.url(),
  ipHash: empreinte,
  userAgentHash: empreinte,
  finalites: z
    .array(
      z.enum([
        'transmission_portail_habitat',
        'mise_en_relation_professionnels',
        'rappel_telephonique',
      ]),
    )
    .min(1),
  recueLe: horodatage,
});

export const FINALITES_OBLIGATOIRES = [
  'transmission_portail_habitat',
  'mise_en_relation_professionnels',
] as const;

const dateIso = z.iso.datetime({ offset: true });

/**
 * Corps du webhook `importerDemandePartenaire` (IMPORT_LEADS §2) : validation stricte, aucun champ
 * inconnu. Le consentement est seulement typé ici ; sa conformité est vérifiée à part (motif dédié).
 */
export const entreeDemandePartenaire = z.strictObject({
  idExterne: z.string().min(1).max(64),
  recueLe: dateIso,
  contact: z.strictObject({
    prenom: z.string().trim().min(1).max(80),
    nom: z.string().trim().min(1).max(80),
    email,
    telephone: z.string().max(20),
    telephoneVerifie: z.boolean(),
  }),
  chantier: z.strictObject({
    codePostal,
    ville: z.string().trim().min(1).max(120),
    typeTravaux: z.string().min(1).max(80),
    description: z.string().max(2000).optional(),
    surfaceM2: z.number().positive().max(100_000).optional(),
  }),
  qualification: z.strictObject({
    statutOccupation: z.enum(['proprietaire_occupant', 'bailleur', 'locataire', 'inconnu']),
    horizon: z.enum(['moins_3_mois', '3_6_mois', 'plus_6_mois', 'renseignement']),
  }),
  aides: z.strictObject({
    eligibilite: z.enum(['eligible', 'ampleur_seulement', 'non_eligible']),
    trancheRevenus: z.enum(['bleu', 'jaune', 'violet', 'rose']).nullable().optional(),
    montantEstimeCentimes: z.number().int().nonnegative().optional(),
    dispositifs: z.array(z.string().max(40)).max(10).optional(),
  }),
  consentement: z.strictObject({
    coche: z.boolean(),
    texteAffiche: z.string().max(2000),
    versionTexte: z.string().max(40),
    horodatage: dateIso,
    urlPage: z.url(),
    ip: z.string().max(64),
    userAgent: z.string().max(1000),
    finalites: z.array(z.string().max(60)).max(10),
  }),
});
export type EntreeDemandePartenaire = z.infer<typeof entreeDemandePartenaire>;

/** Lien du SMS de confirmation (demande partenaire au téléphone non vérifié). */
export const entreeConfirmerTelephone = z.strictObject({
  jeton: z.string().regex(/^[\w-]{20,100}$/),
});
