import { STATUTS_ARTICLE } from '../blog/reglages';
import { z } from '../zod';
import { horodatage, id, schemaVersion } from './commun';

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
const pointSeo = z.object({ cle: z.string().max(40), libelle: z.string().max(160) });

/** `sites/{id}/articles/{id}` (DATABASE §15 quater). Corps assaini côté serveur (BLOG-09). */
export const articleBlog = z.object({
  schemaVersion,
  titre: z.string().max(200),
  sousTitre: z.string().max(300),
  slug,
  /** L'adresse suit le titre tant que l'artisan ne l'a pas fixée. */
  slugAuto: z.boolean(),
  /** Anciennes adresses d'un article publié : redirection 301 (BLOG §7). */
  anciensSlugs: z.array(slug).max(20),
  corpsHtml: z.string().max(200_000),
  /** Référence de média du site (`lib:…`, `up:…`) ou vide. */
  image: z.object({ src: z.string().max(300), alt: z.string().max(200) }),
  meta: z.string().max(320),
  motCle: z.string().max(80),
  motsSecondaires: z.array(z.string().max(80)).max(10),
  categorieId: z.string().max(60),
  tags: z.array(id).max(20),
  auteurUid: id,
  statut: z.enum(STATUTS_ARTICLE),
  datePublication: horodatage.optional(),
  genereParIA: z.boolean(),
  origine: z.enum(['manuel', 'ia']),
  postsReseaux: z
    .object({
      facebook: z.string().max(2000),
      instagram: z.string().max(2200),
      linkedin: z.string().max(3000),
      google: z.string().max(1500),
      hashtags: z.array(z.string().max(60)).max(30),
    })
    .partial()
    .optional(),
  seo: z.object({
    score: z.number().int().min(0).max(100),
    bloquants: z.array(pointSeo).max(20),
    recommandations: z.array(pointSeo).max(20),
  }),
  vues: z.number().int().nonnegative(),
  creeLe: horodatage,
  modifieLe: horodatage,
  /** Corbeille : suppression définitive 30 jours après. */
  supprimeLe: horodatage.optional(),
});

/** `sites/{id}/blogCategories/{id}` : l'ordre est celui des onglets sur le site. */
export const categorieBlog = z.object({
  schemaVersion,
  nom: z.string().trim().min(1).max(60),
  slug,
  ordre: z.number().int().nonnegative(),
});

/** `sites/{id}/blogTags/{id}` (pages de tag en `noindex`). */
export const tagBlog = z.object({ schemaVersion, nom: z.string().trim().min(1).max(40), slug });
