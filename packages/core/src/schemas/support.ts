import { z } from '../zod';
import { email, empreinte, horodatage, id, meta, schemaVersion } from './commun';

export const contact = z.object({
  ...meta,
  nom: z.string().max(120),
  email,
  role: z.enum(['particulier', 'artisan', 'autre']),
  sujet: z.string().max(80),
  message: z.string().min(10).max(5000),
  pieces: z.array(z.string()).max(3).default([]),
  statut: z.enum(['ouvert', 'en_cours', 'resolu']),
  assigneA: id.optional(),
  historique: z
    .array(z.object({ le: horodatage, par: z.string(), action: z.string() }))
    .default([]),
});

export const litige = z.object({
  ...meta,
  demandeId: id.optional(),
  avisId: id.optional(),
  particulierUid: id,
  artisanId: id,
  description: z.string().max(5000),
  statut: z.enum(['ouvert', 'mediation', 'resolu', 'clos']),
  pieces: z.array(z.string()).default([]),
  echanges: z.array(z.object({ le: horodatage, par: z.string(), texte: z.string() })).default([]),
});

/** `emails/{id}` (EMAILS.md §1) : journal d'envoi, idempotent. */
export const envoi = z.object({
  schemaVersion,
  modele: z.string(),
  canal: z.enum(['email', 'sms']),
  destinataire: z.string(),
  uid: id.optional(),
  artisanId: id.optional(),
  categorie: z.enum([
    'securite',
    'transactionnel',
    'activite',
    'relance',
    'offres_pro',
    'marketing',
    'interne',
  ]),
  variante: z.string().optional(),
  sequenceId: id.optional(),
  refObjet: z.string().optional(),
  cleIdempotence: z.string().min(8),
  donnees: z.record(z.string(), z.unknown()),
  envoyerLe: horodatage,
  statut: z.enum([
    'en_file',
    'envoye',
    'delivre',
    'ouvert',
    'clic',
    'rebond',
    'plainte',
    'echec',
    'annule',
    'bloque_preferences',
  ]),
  fournisseurId: z.string().optional(),
  tentatives: z.number().int().nonnegative(),
  erreur: z.string().optional(),
  createdAt: horodatage,
  expireLe: horodatage,
});

/** `suppressions/{emailHash}` : liste de blocage (rebonds, plaintes). */
export const suppression = z.object({
  schemaVersion,
  motif: z.enum(['rebond', 'plainte', 'demande']),
  createdAt: horodatage,
});

export const evenement = z.object({
  schemaVersion,
  type: z.enum(['vue_fiche', 'clic_tel', 'clic_devis', 'recherche']),
  artisanId: id.optional(),
  sessionId: z.string(),
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  createdAt: horodatage,
  /** createdAt + 13 mois : champ TTL (un TTL sur createdAt supprimerait tout de suite). */
  expireLe: horodatage,
});

/** `auditLog/{id}` : création seule, jamais modifié. */
export const entreeAudit = z.object({
  schemaVersion,
  acteurUid: z.string(),
  action: z.string(),
  cible: z.string().optional(),
  avant: z.unknown().optional(),
  apres: z.unknown().optional(),
  motif: z.string().optional(),
  ok: z.boolean(),
  code: z.string().optional(),
  ipHash: empreinte.optional(),
  createdAt: horodatage,
});

/** `rateLimits/{cle}` : compteur par fenêtre (TTL 1 h après la fenêtre). */
export const limiteDebit = z.object({
  schemaVersion,
  compteur: z.number().int().nonnegative(),
  fenetreDebut: horodatage,
  expireLe: horodatage,
});

/** `idempotence/{cle}` : résultat d'une action déjà traitée (TTL 24 h). */
export const idempotence = z.object({
  schemaVersion,
  resultat: z.unknown(),
  createdAt: horodatage,
  expireLe: horodatage,
});

export const demandeRgpd = z.object({
  ...meta,
  type: z.enum(['acces', 'rectification', 'effacement', 'opposition', 'portabilite']),
  demandeurUid: id.optional(),
  email,
  recueLe: horodatage,
  echeance: horodatage,
  statut: z.enum(['a_traiter', 'traite']),
  traitePar: id.optional(),
  preuveStoragePath: z.string().optional(),
});

export const tacheModeration = z.object({
  ...meta,
  type: z.string(),
  refs: z.record(z.string(), z.string()),
  priorite: z.number().int().min(1).max(5),
  statut: z.enum(['a_traiter', 'en_cours', 'traitee', 'rejetee']),
  assigneA: id.optional(),
  permissionRequise: z.string(),
  echeance: horodatage.optional(),
});

export const migration = z.object({
  schemaVersion,
  nom: z.string(),
  curseur: z.string().nullable(),
  traites: z.number().int().nonnegative(),
  termineeLe: horodatage.optional(),
  updatedAt: horodatage,
});
