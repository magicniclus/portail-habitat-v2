import { z } from '../zod';
import { email, empreinte, horodatage, id, meta, moisIso, note, schemaVersion } from './commun';

/**
 * `avis/{id}` : lisible PUBLIQUEMENT une fois publié. Ne contient donc aucune donnée
 * personnelle : l'email, l'uid et l'empreinte IP de l'auteur sont dans `avis/{id}/prive/auteur`.
 */
export const avis = z
  .object({
    ...meta,
    artisanId: id,
    nomAffiche: z.string().min(2).max(60),
    note,
    criteres: z
      .object({ qualite: note, delais: note, proprete: note, rapportQP: note })
      .partial()
      .default({}),
    pointsPositifs: z.array(z.string().max(40)).max(10).default([]),
    texte: z.string().max(1200).default(''),
    photos: z
      .array(z.object({ storagePath: z.string(), url: z.string() }))
      .max(3)
      .default([]),
    typeTravaux: z.string().max(80),
    finChantier: moisIso,
    demandeId: id.optional(),
    certificationAcceptee: z.literal(true),
    preuve: z.object({
      type: z.enum(['facture', 'devis', 'mise_en_relation', 'aucune']),
      storagePath: z.string().optional(),
    }),
    statut: z.enum(['en_attente', 'publie', 'refuse', 'retire', 'suspendu']),
    moderation: z
      .object({
        parUid: id,
        le: horodatage,
        motif: z.string().optional(),
        scoreIa: z.number().optional(),
      })
      .optional(),
    reponse: z.object({ texte: z.string().max(1200), le: horodatage, parUid: id }).optional(),
    publieLe: horodatage.optional(),
    expireAffichageLe: horodatage.optional(),
  })
  .strict();

/** `avis/{id}/prive/auteur` : données de l'auteur (modération uniquement). */
export const auteurAvis = z.object({
  schemaVersion,
  auteurUid: id.optional(),
  auteurEmail: email,
  ipHash: empreinte,
  userAgent: z.string().max(400).optional(),
  /** Empreinte email + artisan + mois de chantier : un seul avis par combinaison (AVI-04). */
  cleUnicite: empreinte.optional(),
});

export const signalement = z.object({
  schemaVersion,
  parUid: id.optional(),
  parRole: z.enum(['particulier', 'artisan', 'visiteur', 'admin']),
  motif: z.string().min(2),
  details: z.string().max(2000).optional(),
  statut: z.enum(['ouvert', 'traite', 'rejete']),
  createdAt: horodatage,
});
