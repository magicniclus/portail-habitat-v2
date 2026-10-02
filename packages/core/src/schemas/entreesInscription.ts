import { z } from '../zod';
import { codePostal, email, geo, id, telephoneFr } from './commun';
import { rayonKm } from './artisans';

/** Étape 1 (formulaire de la page d'acquisition, COMPTES §3.1 bis) : identité, métiers, chantiers. */
export const entreeInscriptionEtape1 = z
  .strictObject({
    nom: z.string().trim().min(2, 'Indiquez votre nom et prénom').max(80),
    telephone: telephoneFr,
    email,
    codePostal,
    metierPrincipal: id,
    metiers: z.array(id).min(1).max(5),
    intentions: z.array(id).max(200),
    cgv: z.literal(true, 'Acceptez les conditions pour continuer'),
    /** Piège à robots. */
    site: z.string().max(0).optional(),
  })
  .refine((e) => e.metiers.includes(e.metierPrincipal), {
    message: 'Le métier principal doit faire partie des métiers.',
    path: ['metiers'],
  });

/** Étape 2 (zone, COMPTES §3.2) : ville choisie, rayon 10 à 100 km (D31c). */
export const entreeInscriptionEtape2 = z.strictObject({
  ville: z.string().trim().min(2).max(80),
  centre: geo,
  rayonKm,
});

/** Reprise par le lien reçu par email (ONB-04). */
export const entreeRepriseInscription = z.strictObject({ jeton: z.string().min(20).max(200) });

/** Étape 3 : entreprise choisie par son SIREN ; tout le reste vient du brouillon, relu côté serveur. */
export const entreeFinaliserInscription = z.strictObject({
  cleIdempotence: z.string().min(8).max(64),
  siren: z.string().regex(/^\d{9}$/, 'SIREN à 9 chiffres'),
});
