import { ROLES_MEMBRE } from '../equipe/permissions';
import { z } from '../zod';
import {
  adresse,
  email,
  empreinte,
  horodatage,
  id,
  meta,
  schemaVersion,
  siren,
  telephoneE164,
} from './commun';

const canaux = z.object({ email: z.boolean(), sms: z.boolean(), inapp: z.boolean() });

/** `users/{uid}` (DATABASE §2, COMPTES §1 prime). */
export const utilisateur = z.object({
  ...meta,
  roles: z.array(z.enum(['particulier', 'artisan'])).max(2),
  email,
  emailVerifie: z.boolean(),
  telephone: telephoneE164.optional(),
  telephoneVerifie: z.boolean().default(false),
  prenom: z.string().max(80).optional(),
  nom: z.string().max(80).optional(),
  nomAffiche: z.string().max(80).optional(),
  adresse: adresse.optional(),
  entreprises: z.array(id).max(10).default([]),
  entrepriseActive: id.optional(),
  fournisseurs: z.array(z.enum(['password', 'lien', 'google', 'telephone'])),
  origine: z.enum(['inscription', 'demande', 'onboarding_pro', 'invitation', 'admin']),
  preferences: z.object({
    notifs: z.object({ activite: canaux, relance: canaux, offres_pro: canaux, marketing: canaux }),
    langue: z.literal('fr'),
  }),
  mfaActive: z.boolean().default(false),
  cguVersionAcceptee: z.string().optional(),
  cguAccepteeLe: horodatage.optional(),
  derniereConnexion: horodatage.optional(),
  statut: z.enum(['actif', 'suspendu', 'supprime']),
  suspensionMotif: z.string().optional(),
});

export const TYPES_CONSENTEMENT = [
  'cgu',
  'cgv',
  'confidentialite',
  'marketing_email',
  'opposition_offres_pro',
  'cookies_mesure',
  'cookies_pub',
  'mise_en_relation',
] as const;

/** `users/{uid}/consentements/{id}` : journal en ajout seul. */
export const consentement = z.object({
  schemaVersion,
  type: z.enum(TYPES_CONSENTEMENT),
  valeur: z.boolean(),
  version: z.string().min(1),
  ipHash: empreinte.optional(),
  userAgent: z.string().max(400).optional(),
  source: z.string().max(200),
  createdAt: horodatage,
});

export const notification = z.object({
  schemaVersion,
  type: z.string(),
  titre: z.string().max(140),
  corps: z.string().max(1000),
  lien: z.string().optional(),
  lu: z.boolean(),
  createdAt: horodatage,
});

/** `admins/{uid}` (ADMIN.md §1). */
export const admin = z.object({
  ...meta,
  nom: z.string(),
  email,
  role: z.string().min(1),
  permissionsPlus: z.array(z.string()).default([]),
  permissionsMoins: z.array(z.string()).default([]),
  permissionsEffectives: z.array(z.string()),
  mfaObligatoire: z.literal(true),
  ipAutorisees: z.array(z.string()).optional(),
  actif: z.boolean(),
  dernierAcces: horodatage.optional(),
});

export const roleAdmin = z.object({
  ...meta,
  nom: z.string().min(2),
  permissions: z.array(z.string()),
  creePar: id,
});

/** `invitations/{id}` : le jeton n'est jamais stocké en clair. */
export const invitation = z
  .object({
    ...meta,
    artisanId: id,
    email,
    /** `proprietaire` seulement pour une invitation de revendication envoyée par l'admin. */
    role: z.enum(ROLES_MEMBRE),
    /** Entreprise créée par l'admin et non revendiquée (COMPTES §3.5) : le destinataire en devient propriétaire. */
    revendication: z.boolean().optional(),
    permissions: z.array(z.string()).optional(),
    metiers: z.array(id).optional(),
    invitePar: id,
    jetonHash: empreinte,
    statut: z.enum(['envoyee', 'acceptee', 'revoquee', 'expiree']),
    expireLe: horodatage,
    acceptePar: id.optional(),
  })
  .refine((i) => i.role !== 'proprietaire' || i.revendication === true, {
    message: 'Seule une revendication invite un propriétaire',
    path: ['role'],
  });

export const revendication = z.object({
  ...meta,
  artisanId: id,
  demandeurUid: id,
  siren,
  preuve: z.enum(['email_domaine', 'kbis', 'courrier_code', 'telephone_siege']),
  statut: z.enum(['ouverte', 'acceptee', 'refusee']),
  traitePar: id.optional(),
});

export const demandeAcces = z.object({
  ...meta,
  artisanId: id,
  demandeurUid: id,
  message: z.string().max(1000).optional(),
  statut: z.enum(['ouverte', 'acceptee', 'refusee', 'expiree']),
  traitePar: id.optional(),
  expireLe: horodatage,
});

/** `sirenIndex/{siren}` : garde-fou d'unicité, créé en transaction avec l'entreprise. */
export const sirenIndex = z.object({ schemaVersion, artisanId: id, createdAt: horodatage });
