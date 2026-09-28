import { ACTIONS_EQUIPE, ROLES_MEMBRE } from '../equipe/permissions';
import { z } from '../zod';
import { adresse, centimesPositifs, email, geo, id, siren, siret, telephoneE164 } from './commun';
import { rayonKm } from './artisans';

/** Entrées des Server Actions et Functions de comptes (COMPTES §7). Dates en chaînes ISO côté client. */
const cleIdempotence = z.string().min(8).max(64);
const roleInvitable = z.enum(ROLES_MEMBRE).exclude(['proprietaire']);
const surcharges = z.array(z.enum(ACTIONS_EQUIPE)).max(ACTIONS_EQUIPE.length);

/** POST /api/session : jeton d'identification Firebase à échanger contre un cookie. */
export const entreeSession = z.object({
  jetonId: z.string().min(20).max(4096),
  espace: z.enum(['particulier', 'pro']),
});

export const entreeFinaliserOnboarding = z
  .object({
    cleIdempotence,
    brouillonId: id.optional(),
    entreprise: z.object({
      siren,
      siret,
      raisonSociale: z.string().trim().min(1).max(200),
      nomCommercial: z.string().trim().min(1).max(120),
      formeJuridique: z.string().max(80).optional(),
      codeNaf: z.string().max(10).optional(),
      dateCreationEntreprise: z.coerce.date().optional(),
      adresseSiege: adresse,
      /** Téléphone saisi à l'étape 1 : affiché seulement en Premium ou avec l'option Visibilité. */
      telephonePublic: telephoneE164.optional(),
    }),
    metierPrincipal: id,
    metiers: z.array(id).min(1).max(5),
    intentions: z.array(id).max(200),
    zone: z.object({ centre: geo, rayonKm }),
    budgetMin: centimesPositifs.optional(),
    /** Version des CGV Pro acceptées (case obligatoire de l'étape 3). */
    cgvVersion: z.string().min(1).max(20),
  })
  .refine((e) => e.metiers.includes(e.metierPrincipal), {
    message: 'Le métier principal doit faire partie des métiers.',
    path: ['metiers'],
  })
  .refine((e) => e.entreprise.siret.startsWith(e.entreprise.siren), {
    message: 'Le SIRET doit commencer par le SIREN.',
    path: ['entreprise', 'siret'],
  });

export const entreeInviterMembre = z.object({
  cleIdempotence,
  artisanId: id,
  email,
  role: roleInvitable,
  metiers: z.array(id).max(5).optional(),
  permissions: surcharges.optional(),
  plafondCreditsMois: z.number().int().nonnegative().max(1000).optional(),
});

export const entreeInvitation = z.object({ artisanId: id, invitationId: id });

/** Jeton reçu par email : 32 octets aléatoires en base64url. */
export const entreeAccepterInvitation = z.object({
  jeton: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Lien d’invitation invalide'),
});

export const entreeModifierMembre = z.object({
  artisanId: id,
  uid: id,
  role: roleInvitable.optional(),
  metiers: z.array(id).max(5).optional(),
  permissions: surcharges.optional(),
  plafondCreditsMois: z.number().int().nonnegative().max(1000).nullable().optional(),
});

export const entreeMembre = z.object({ artisanId: id, uid: id });
export const entreeEntreprise = z.object({ artisanId: id });

export const entreeDemanderAcces = z.object({
  artisanId: id,
  message: z.string().trim().max(1000).optional(),
});

export const entreeRepondreDemandeAcces = z
  .object({
    artisanId: id,
    demandeId: id,
    accepter: z.boolean(),
    role: roleInvitable.optional(),
  })
  .refine((e) => !e.accepter || e.role, { message: 'Choisissez un rôle.', path: ['role'] });

export const entreeFermerEntreprise = z.object({
  artisanId: id,
  /** Nom commercial ressaisi pour confirmer. */
  confirmation: z.string().trim().min(1).max(120),
});

export const entreeSupprimerMonCompte = z.object({ confirmation: z.literal('SUPPRIMER') });

export const entreeRechercherEntreprise = z.object({
  q: z.string().trim().min(2).max(120),
});

/** Lien magique et mot de passe oublié : même réponse que l'adresse existe ou non (EMAILS §4.1). */
export const entreeEmailAuth = z.object({
  email,
  espace: z.enum(['particulier', 'pro']).default('particulier'),
});
