import type { DroitsFormule } from '../paiements/droits';

/** Statuts d'un article (DATABASE §15 quater) et leurs libellés. */
export const STATUTS_ARTICLE = ['brouillon', 'planifie', 'publie', 'archive'] as const;
export type StatutArticle = (typeof STATUTS_ARTICLE)[number];
export const STATUTS_ARTICLE_AFFICHES = {
  brouillon: { libelle: 'Brouillon', tone: 'neutre' },
  planifie: { libelle: 'Planifié', tone: 'info' },
  publie: { libelle: 'Publié', tone: 'succes' },
  archive: { libelle: 'Archivé', tone: 'attention' },
} as const satisfies Record<StatutArticle, { libelle: string; tone: string }>;
export const LIBELLES_STATUT_ARTICLE: Record<StatutArticle, string> = {
  brouillon: STATUTS_ARTICLE_AFFICHES.brouillon.libelle,
  planifie: STATUTS_ARTICLE_AFFICHES.planifie.libelle,
  publie: STATUTS_ARTICLE_AFFICHES.publie.libelle,
  archive: STATUTS_ARTICLE_AFFICHES.archive.libelle,
};

/** Actions groupées de la liste (BLOG §5). */
export const ACTIONS_ARTICLES = [
  ['publier', 'Publier'],
  ['archiver', 'Archiver'],
  ['brouillon', 'Remettre en brouillon'],
  ['corbeille', 'Mettre à la corbeille'],
] as const;

/** Rédactions complètes par l'IA, par mois (D66 ✅). Retouches illimitées. */
export const ARTICLES_IA_MOIS = { sitePro: 5, toutInclus: 15 } as const;

export function creditsArticlesMois(d: Pick<DroitsFormule, 'formule' | 'sitePro'>): number {
  if (!d.sitePro) return 0;
  return d.formule === 'tout_inclus' ? ARTICLES_IA_MOIS.toutInclus : ARTICLES_IA_MOIS.sitePro;
}

/** Corbeille : suppression définitive 30 jours après (BLOG §5). */
export const CORBEILLE_JOURS = 30;

/** Planifiés dont la date est passée : la tâche des 5 minutes les publie. */
export function articlesAPublier(
  articles: readonly { id: string; statut: StatutArticle; datePublication?: number }[],
  maintenant: number,
): string[] {
  return articles
    .filter(
      (a) =>
        a.statut === 'planifie' &&
        a.datePublication !== undefined &&
        a.datePublication <= maintenant,
    )
    .map((a) => a.id);
}
