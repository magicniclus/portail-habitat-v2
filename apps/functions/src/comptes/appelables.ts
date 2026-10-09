import * as comptes from '@ph/firebase/comptes';
import {
  entreeAccepterInvitation,
  entreeDemanderAcces,
  entreeEmailAuth,
  entreeEntreprise,
  entreeFermerEntreprise,
  entreeFinaliserOnboarding,
  entreeInvitation,
  entreeInviterMembre,
  entreeMembre,
  entreeModifierMembre,
  entreeRechercherEntreprise,
  entreeRepondreDemandeAcces,
  entreeSupprimerMonCompte,
} from '@ph/core/schemas';
import { z } from '@ph/core/zod';
import { callable } from '../callable';
import { services } from './services';

// COMPTES §7 : App Check, Zod, peut() (relu dans la transaction), audit des actions sur les membres
// et la propriété, idempotence des actions déclenchées par un clic.
const limite = (cle: string, max: number) => ({ cle, max, fenetre: '1h' as const });

/** Formulaire de la page d'acquisition, avant toute création de compte : ouvert, limité par IP. */
export const rechercherEntreprise = callable(
  {
    schema: entreeRechercherEntreprise,
    nom: 'rechercherEntreprise',
    authentification: 'facultative',
    rateLimit: limite('recherche-entreprise', 60),
  },
  (e) => comptes.rechercherEntreprise(services(), e.q),
);

export const finaliserOnboarding = callable(
  {
    schema: entreeFinaliserOnboarding,
    nom: 'finaliserOnboarding',
    idempotence: true,
    audit: true,
    rateLimit: limite('onboarding', 10),
  },
  (e, ctx) => comptes.finaliserOnboarding(services(), ctx.uid!, e),
);

export const inviterMembre = callable(
  {
    schema: entreeInviterMembre,
    nom: 'inviterMembre',
    permission: 'membres.gerer',
    idempotence: true,
    audit: true,
  },
  (e, ctx) => comptes.inviterMembre(services(), ctx.uid!, e),
);
export const renvoyerInvitation = callable(
  {
    schema: entreeInvitation,
    nom: 'renvoyerInvitation',
    permission: 'membres.gerer',
    audit: true,
    rateLimit: limite('renvoi-invitation', 10),
  },
  (e, ctx) => comptes.renvoyerInvitation(services(), ctx.uid!, e),
);
export const revoquerInvitation = callable(
  { schema: entreeInvitation, nom: 'revoquerInvitation', permission: 'membres.gerer', audit: true },
  (e, ctx) => comptes.revoquerInvitation(services(), ctx.uid!, e),
);
export const accepterInvitation = callable(
  {
    schema: entreeAccepterInvitation,
    nom: 'accepterInvitation',
    audit: true,
    rateLimit: limite('accepter-invitation', 20),
  },
  (e, ctx) => comptes.accepterInvitation(services(), ctx.uid!, e),
);

export const demanderAcces = callable(
  {
    schema: entreeDemanderAcces,
    nom: 'demanderAcces',
    audit: true,
    rateLimit: limite('demande-acces', 5),
  },
  (e, ctx) => comptes.demanderAcces(services(), ctx.uid!, e),
);
export const repondreDemandeAcces = callable(
  {
    schema: entreeRepondreDemandeAcces,
    nom: 'repondreDemandeAcces',
    permission: 'membres.gerer',
    audit: true,
  },
  (e, ctx) => comptes.repondreDemandeAcces(services(), ctx.uid!, e),
);

export const modifierMembre = callable(
  { schema: entreeModifierMembre, nom: 'modifierMembre', permission: 'membres.gerer', audit: true },
  (e, ctx) => comptes.modifierMembre(services(), ctx.uid!, e),
);
export const retirerMembre = callable(
  { schema: entreeMembre, nom: 'retirerMembre', permission: 'membres.gerer', audit: true },
  (e, ctx) => comptes.retirerMembre(services(), ctx.uid!, e),
);
export const quitterEntreprise = callable(
  { schema: entreeEntreprise, nom: 'quitterEntreprise', audit: true },
  (e, ctx) => comptes.quitterEntreprise(services(), ctx.uid!, e.artisanId),
);
export const transfererPropriete = callable(
  {
    schema: entreeMembre,
    nom: 'transfererPropriete',
    permission: 'propriete.transferer',
    audit: true,
    authRecenteMin: 5,
  },
  (e, ctx) => comptes.transfererPropriete(services(), ctx.uid!, e),
);

export const fermerEntreprise = callable(
  {
    schema: entreeFermerEntreprise,
    nom: 'fermerEntreprise',
    permission: 'entreprise.fermer',
    audit: true,
    authRecenteMin: 5,
    secondFacteur: true,
  },
  (e, ctx) => comptes.fermerEntreprise(services(), ctx.uid!, e),
);
export const supprimerMonCompte = callable(
  { schema: entreeSupprimerMonCompte, nom: 'supprimerMonCompte', audit: true, authRecenteMin: 5 },
  async (_e, ctx) => comptes.supprimerMonCompte(services(), ctx.uid!),
);

// Emails d'authentification (EMAILS §4.1, §6) : même réponse que l'adresse existe ou non.
export const demanderLienConnexion = callable(
  {
    schema: entreeEmailAuth,
    nom: 'demanderLienConnexion',
    authentification: 'facultative',
    rateLimit: limite('lien-connexion', 20),
  },
  async (e) => {
    await comptes.envoyerLienConnexion(services(), e.email, e.espace);
    return { envoye: true as const };
  },
);
export const demanderReinitialisation = callable(
  {
    schema: entreeEmailAuth,
    nom: 'demanderReinitialisation',
    authentification: 'facultative',
    rateLimit: limite('mdp-oublie', 20),
  },
  async (e) => {
    await comptes.envoyerReinitialisation(services(), e.email);
    return { envoye: true as const };
  },
);
export const renvoyerVerificationEmail = callable(
  {
    schema: z.object({}),
    nom: 'renvoyerVerificationEmail',
    rateLimit: { cle: 'verifier-email', max: 5, fenetre: '1j' },
  },
  async (_e, ctx) => {
    await comptes.envoyerVerificationEmail(services(), ctx.uid!);
    return { envoye: true as const };
  },
);
