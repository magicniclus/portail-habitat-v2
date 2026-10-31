import { formatDate } from '../format/dates';
import { LIBELLES_STATUT_ARTICLE, type StatutArticle } from './reglages';

export interface ArticleExporte {
  titre: string;
  slug: string;
  statut: StatutArticle;
  categorie: string;
  tags: string[];
  datePublication?: number;
  vues: number;
  auteur: string;
  genereParIA: boolean;
}

/** Export CSV de la liste (BLOG §5, BLOG-08) : une ligne par article. */
export function lignesExportArticles(articles: readonly ArticleExporte[], hote: string) {
  return {
    entetes: [
      'Titre',
      'Adresse',
      'Statut',
      'Catégorie',
      'Tags',
      'Date',
      'Vues',
      'Auteur',
      'Rédigé avec l’IA',
    ],
    lignes: articles.map((a) => [
      a.titre,
      `https://${hote}/blog/${a.slug}`,
      LIBELLES_STATUT_ARTICLE[a.statut],
      a.categorie,
      a.tags.join(', '),
      a.datePublication ? formatDate(a.datePublication) : '',
      String(a.vues),
      a.auteur,
      a.genereParIA ? 'Oui' : 'Non',
    ]),
  };
}
