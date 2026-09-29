import { z } from '../zod';
import { rayonKm } from './artisans';
import { email, geo, id, telephoneFr } from './commun';

/** « Mes demandes » (PRO-02) : ouvrir, accepter ou refuser une demande reçue. */
export const entreeReponseDemande = z.strictObject({
  demandeId: id,
  action: z.enum(['voir', 'accepter', 'refuser']),
  motif: z.string().trim().max(300).optional(),
});

/** « Je m'en occupe » (PRO-03). */
export const entreePrendreDemande = z.strictObject({ demandeId: id });

/** Réponse publique de l'artisan à un avis (affichée sur sa fiche). */
export const entreeReponseAvis = z.strictObject({
  avisId: id,
  texte: z.string().trim().min(2, 'Écrivez votre réponse').max(1200),
});

/**
 * Ma fiche (maquette Ma Fiche) : chaque section s'enregistre seule. Chaîne vide = champ retiré.
 * Montants saisis en euros entiers, convertis en centimes par le serveur.
 */
export const entreeModifierFiche = z
  .strictObject({
    pitch: z.string().trim().max(280).optional(),
    description: z.string().trim().max(3000).optional(),
    telephonePublic: z.union([telephoneFr, z.literal('')]).optional(),
    emailContact: z.union([email, z.literal('')]).optional(),
    siteWeb: z.union([z.url({ protocol: /^https?$/ }), z.literal('')]).optional(),
    devis: z
      .strictObject({
        minEuros: z.number().int().min(0).max(10_000_000),
        maxEuros: z.number().int().min(0).max(10_000_000),
      })
      .refine((d) => d.minEuros <= d.maxEuros, {
        message: 'Le minimum dépasse le maximum.',
        path: ['maxEuros'],
      })
      .optional(),
    /** Centre (commune choisie dans la liste) et rayon ; le geohash est calculé par le serveur. */
    zone: z.strictObject({ centre: geo, rayonKm }).optional(),
  })
  .refine((e) => Object.keys(e).length > 0, 'Rien à enregistrer.');
