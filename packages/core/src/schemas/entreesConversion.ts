import { z } from '../zod';
import { ETAPES_CYCLE } from './conversion';
import { codePostal, email, id } from './commun';
import { motifAdmin } from './entreesPro';

/** Back-office › Conversion (ADMIN §2.8b, CONVERSION §9) : séquences, fiche cycle, réglages. */

const idSequence = z
  .string()
  .trim()
  .regex(/^[A-Z][A-Z0-9-]{0,15}$/, 'Identifiant en majuscules (ex. S10)');

export const etapeSequenceSaisie = z.strictObject({
  modele: z.string().trim().min(1).max(60),
  declencheur: z.enum(['immediat', 'delai', 'signal', 'planifie']),
  valeur: z.union([z.string().trim().max(40), z.number().int().min(0).max(365)]).optional(),
  ab: z.array(z.string().trim().min(1).max(10)).max(3).optional(),
});

export const entreeSequenceAdmin = z.strictObject({
  /** Absent : nouvelle séquence (identifiant attribué). */
  id: idSequence.optional(),
  nom: z.string().trim().min(3).max(80),
  etapeEntree: z.enum(ETAPES_CYCLE),
  objectif: z.string().trim().min(3).max(120),
  actif: z.boolean(),
  etapes: z.array(etapeSequenceSaisie).min(1).max(12),
  motif: motifAdmin,
});

export const entreeBasculerSequence = z.strictObject({
  id: idSequence,
  actif: z.boolean(),
  motif: motifAdmin,
});

export const entreeSupprimerSequence = z
  .strictObject({
    id: idSequence,
    /** L'identifiant retapé : double confirmation. */
    confirmation: z.string().trim(),
    devenir: z.enum(['arret', 'bascule']),
    versSequence: idSequence.optional(),
    motif: motifAdmin,
  })
  .refine((e) => e.confirmation === e.id, {
    message: 'Retapez l’identifiant exact de la séquence.',
    path: ['confirmation'],
  })
  .refine((e) => e.devenir === 'arret' || (e.versSequence && e.versSequence !== e.id), {
    message: 'Choisissez la séquence de destination.',
    path: ['versSequence'],
  });

export const entreeActionCycle = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('pause'), artisanId: id, motif: motifAdmin }),
  z.strictObject({ action: z.literal('reprendre'), artisanId: id, motif: motifAdmin }),
  z.strictObject({ action: z.literal('exclure'), artisanId: id, motif: motifAdmin }),
  z.strictObject({ action: z.literal('inclure'), artisanId: id, motif: motifAdmin }),
  z.strictObject({
    action: z.literal('forcer'),
    artisanId: id,
    sequenceId: idSequence,
    motif: motifAdmin,
  }),
]);

export const entreeReglagesCycle = z.strictObject({
  actif: z.boolean(),
  maxOffresProSemaine: z.number().int().min(0).max(7),
  maxNonTransacJour: z.number().int().min(0).max(5),
  veilleApres: z.number().int().min(1).max(20),
  seuilPremium: z.number().int().min(0).max(100),
  seuilAppel: z.number().int().min(0).max(100),
  tailleTemoin: z.number().min(0).max(0.5),
  signataire: z.strictObject({
    nom: z.string().trim().min(2).max(40),
    email: z.email(),
  }),
  motif: motifAdmin,
});

/** Texte affiché à côté du bouton et gardé comme preuve (CONVERSION §7, intérêt légitime B2B). */
export const TEXTE_CONSENTEMENT_PROSPECT =
  'Votre email sert à vous envoyer cette estimation et des informations sur les demandes de votre métier. Désinscription en un clic dans chaque email.';

/** Page d'acquisition : « Recevoir l'estimation par email » (prospect, séquence S1). */
export const entreeProspect = z.strictObject({
  email,
  metier: id,
  codePostal,
  /** Arrivé par le lien du groupe Facebook (`utm_source=facebook`). */
  source: z.enum(['estimation', 'facebook']).optional(),
  /** Champ piège pour les robots : doit rester vide. */
  site: z.string().max(0).optional(),
});

/** Publication Facebook du jour marquée comme faite (département publié). */
export const entreePublicationFacebook = z.strictObject({
  departement: z.string().regex(/^(\d{2}|2[AB]|97)$/),
});

/** Parcours de résiliation (CONVERSION S8) : raison obligatoire, puis alternative ou confirmation. */
export const entreeResiliation = z.strictObject({
  etape: z.enum(['proposer', 'accepter', 'confirmer']),
  abonnementId: z.string().regex(/^sub_[A-Za-z0-9]+$/),
  raison: z.enum(['trop_cher', 'pas_assez_demandes', 'saison_creuse', 'autre']),
});
