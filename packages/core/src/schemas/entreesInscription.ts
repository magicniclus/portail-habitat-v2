import { estSiretValide, normaliserSiren } from '../format/siren';
import { z } from '../zod';
import { codePostal, email, geo, id } from './commun';
import { entreeAcquisition, rayonKm } from './artisans';

/**
 * Étape 1 (formulaire court des pages d'entrée, COMPTES §3.1 bis, décision du 17/11/2026) : métier,
 * code postal, email. Le nom vient de Google ou de l'étape compte ; le téléphone se demande dans
 * l'espace. Les conditions sont acceptées par l'envoi (phrase sous le bouton) : le serveur
 * enregistre leur version, il n'y a plus de case à cocher.
 */
export const entreeInscriptionEtape1 = z
  .strictObject({
    email,
    codePostal,
    metierPrincipal: id,
    metiers: z.array(id).min(1).max(5),
    intentions: z.array(id).max(200),
    /** Landing d'origine (LANDINGS §1), gardée dans le brouillon puis écrite sur le compte. */
    acquisition: entreeAcquisition.optional(),
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
  /** Code postal de la ville choisie : même estimation des demandes aux étapes 2 et 3. */
  codePostal: z
    .string()
    .regex(/^\d{5}$/)
    .optional(),
  centre: geo,
  rayonKm,
});

/** Reprise par le lien reçu par email (ONB-04). */
export const entreeRepriseInscription = z.strictObject({ jeton: z.string().min(20).max(200) });

/** Étape 3, entreprise trouvée au répertoire : son SIREN ; tout le reste est relu côté serveur. */
const finaliserParSiren = z.strictObject({
  cleIdempotence: z.string().min(8).max(64),
  siren: z.string().regex(/^\d{9}$/, 'SIREN à 9 chiffres'),
});

/**
 * Étape 3, « Je ne trouve pas mon entreprise » (décision du 15/11/2026) : SIRET, nom et adresse du
 * siège saisis à la main. La fiche reste hors ligne jusqu'à la vérification d'un modérateur.
 */
const finaliserSaisieManuelle = z.strictObject({
  cleIdempotence: z.string().min(8).max(64),
  manuelle: z.strictObject({
    siret: z
      .string()
      .transform(normaliserSiren)
      .refine(estSiretValide, 'Numéro SIRET invalide : 14 chiffres, sur votre Kbis'),
    raisonSociale: z.string().trim().min(2, 'Indiquez le nom de votre entreprise').max(200),
    adresse: z.strictObject({
      ligne1: z.string().trim().min(3, 'Indiquez l’adresse du siège').max(200),
      codePostal,
      ville: z.string().trim().min(2).max(80),
    }),
  }),
});

export const entreeFinaliserInscription = z.union([finaliserParSiren, finaliserSaisieManuelle]);
