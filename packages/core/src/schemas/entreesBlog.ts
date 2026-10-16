import { ACTIONS_IA_BLOG, TYPES_ARTICLE } from '../blog/ia';
import { z } from '../zod';
import { id } from './commun';

const idArticle = z.string().regex(/^[A-Za-z0-9]{1,40}$/);

/** Enregistrement d'un article (brouillon) : le serveur assainit, recalcule l'adresse et le SEO. */
export const entreeArticle = z.object({
  articleId: idArticle.optional(),
  titre: z.string().trim().max(200),
  sousTitre: z.string().trim().max(300),
  /** Adresse fixée par l'artisan ; absente : elle suit le titre. */
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80)
    .optional(),
  corpsHtml: z.string().max(200_000),
  image: z.object({ src: z.string().max(300), alt: z.string().trim().max(200) }),
  meta: z.string().trim().max(320),
  motCle: z.string().trim().max(80),
  motsSecondaires: z.array(z.string().trim().max(80)).max(10),
  categorieId: z.string().max(60),
  tags: z.array(id).max(20),
  auteurUid: id.optional(),
  /** Texte rédigé par l'IA (badge « rédigé avec l'IA », définitif une fois posé). */
  genereParIA: z.boolean().optional(),
});

/** Actions sur un ou plusieurs articles (BLOG §5) ; « planifier » exige une date future. */
export const entreeActionArticles = z.object({
  ids: z.array(idArticle).min(1).max(100),
  action: z.enum(['publier', 'planifier', 'archiver', 'brouillon', 'corbeille', 'restaurer']),
  date: z.iso.datetime().optional(),
});

export const entreeCategorieBlog = z.discriminatedUnion('action', [
  z.object({ action: z.literal('creer'), nom: z.string().trim().min(1).max(60) }),
  z.object({ action: z.literal('renommer'), id, nom: z.string().trim().min(1).max(60) }),
  z.object({ action: z.literal('ordonner'), ids: z.array(id).min(1).max(50) }),
  z.object({ action: z.literal('supprimer'), id }),
]);

export const entreeTagBlog = z.discriminatedUnion('action', [
  z.object({ action: z.literal('creer'), nom: z.string().trim().min(1).max(40) }),
  z.object({ action: z.literal('supprimer'), id }),
]);

/** Demande à l'IA du blog : rédaction complète (1 crédit) ou retouche (illimitée). */
export const entreeIaBlog = z.object({
  action: z.enum(ACTIONS_IA_BLOG),
  sujet: z.string().trim().max(300).optional(),
  type: z.enum(TYPES_ARTICLE).optional(),
  longueur: z.enum(['court', 'moyen', 'long']).optional(),
  chantiers: z.boolean().optional(),
  article: z.object({
    titre: z.string().max(200),
    meta: z.string().max(320),
    motCle: z.string().max(80),
    corps: z.string().max(20_000),
  }),
});
