import { z } from '../zod';
import { codePostal, geo, geohash, horodatage, id, schemaVersion } from './commun';

/**
 * Pages de secteur « métier à une commune » (registre, SEO local) : créées quand un artisan en
 * ligne exerce ce métier dans la commune ou dans une grande voisine de sa zone ; indexées
 * seulement avec au moins un artisan du secteur (INTEGRATIONS §SEO, décision du 24/11/2026).
 */
export const communeSecteur = z.object({
  nom: z.string().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  codePostal: codePostal.or(z.literal('')),
  departement: z.string().max(3),
  population: z.number().int().nonnegative(),
  centre: geo,
});

const lienHttps = z.url({ protocol: /^https$/ });

/** Texte local rédigé par l'IA : faits sourcés à part, contrôlés avant publication. */
export const texteSecteur = z.object({
  intro: z.string().min(120).max(900),
  sections: z
    .array(
      z.object({
        titre: z.string().min(8).max(110),
        paragraphes: z.array(z.string().min(60).max(1200)).min(1).max(4),
      }),
    )
    .min(3)
    .max(6),
  faq: z
    .array(z.object({ q: z.string().min(10).max(160), r: z.string().min(30).max(700) }))
    .min(4)
    .max(8),
  faits: z.array(z.object({ texte: z.string().min(10).max(300), source: lienHttps })).max(12),
});

export const pageSecteur = z.object({
  schemaVersion,
  metier: id,
  commune: communeSecteur,
  /** Geohash du centre de la commune : pages proches d'un artisan qui change. */
  geohash,
  /** Artisans en ligne qui exercent ce métier dans un rayon de 20 km. */
  nbArtisans: z.number().int().nonnegative(),
  /** Au moins un artisan et page non bloquée par l'admin. */
  indexable: z.boolean(),
  bloquee: z.boolean(),
  texte: texteSecteur.optional(),
  texteEtat: z.enum(['absent', 'pret', 'echec']),
  texteModele: z.string().max(60).optional(),
  texteGenereLe: horodatage.optional(),
  texteEssais: z.number().int().nonnegative(),
  texteErreur: z.string().max(300).optional(),
  /** Rédaction en cours depuis (verrou de 10 minutes : un seul appel à l'IA à la fois). */
  texteVerrou: horodatage.optional(),
  creeeLe: horodatage,
  majLe: horodatage,
});

export type CommuneSecteur = z.infer<typeof communeSecteur>;
export type TexteSecteur = z.infer<typeof texteSecteur>;
export type PageSecteur = z.infer<typeof pageSecteur>;
