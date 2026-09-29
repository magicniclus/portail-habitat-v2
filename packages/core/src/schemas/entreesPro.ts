import { z } from '../zod';
import { rayonKm, TYPES_DOCUMENT } from './artisans';
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

/**
 * Document déposé (Kbis, décennale…) : le fichier est déjà dans Storage
 * (`artisans/{id}/documents/{docId}/{nomFichier}`) ; le serveur le vérifie avant de l'enregistrer.
 */
const nomFichier = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[^/\\]+$/, 'Nom de fichier invalide');
const idFichier = z.string().regex(/^[A-Za-z0-9]{20,32}$/);

export const entreeDocument = z.strictObject({
  docId: idFichier,
  type: z.enum(TYPES_DOCUMENT),
  nomFichier,
});

/** Logo déposé dans Storage (`artisans/{id}/logo/{nomFichier}`), public une fois enregistré. */
export const entreeLogo = z.strictObject({ nomFichier });

/**
 * Réalisation (photos déjà dans `artisans/{id}/realisations/{rid}/`) : publiée seulement avec
 * l'autorisation du propriétaire du chantier (CGV §9).
 */
export const entreeRealisation = z.strictObject({
  rid: idFichier,
  titre: z.string().trim().min(2, 'Donnez un titre au chantier').max(120),
  ville: z.string().trim().min(2).max(80),
  description: z.string().trim().max(2000).default(''),
  photos: z
    .array(
      z.strictObject({
        nomFichier,
        largeur: z.number().int().min(1).max(20_000),
        hauteur: z.number().int().min(1).max(20_000),
      }),
    )
    .min(1, 'Ajoutez au moins une photo')
    .max(20),
  autorisationProprietaire: z.literal(true, "Confirmez l'accord du propriétaire du chantier"),
});

export const entreeSupprimerRealisation = z.strictObject({ rid: idFichier });
