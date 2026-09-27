import { z } from '../zod';
import { centimesPositifs, empreinte, horodatage, id, meta, schemaVersion } from './commun';

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
  quotaJour: z.number().int().positive(),
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
  demandeId: id.optional(),
  payloadHash: empreinte,
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
