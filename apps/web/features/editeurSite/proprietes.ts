import type { ChampFormulaire, OperationIa, QuestionCreation } from '@ph/core/sites';
import type { Panneau } from './BarreEditeur';
import type { RestantsIa } from './modesIa';
import type { BrouillonSite } from './useBrouillonSite';
import type { ArticleRendu, ClassementRendu } from '@/features/siteArtisan/blog';

/** Données de l'éditeur, lues côté serveur par la page `/pro/site/editeur`. */
export interface ProprietesEditeur {
  initial: BrouillonSite;
  pageInitiale: string;
  panneauInitial: Panneau | null;
  medias: Record<string, string>;
  /** Entreprise active : dossier Storage de la médiathèque. */
  artisanId: string;
  hote: string;
  offre: 'gratuit' | 'site_pro';
  champs?: ChampFormulaire[];
  ville?: string;
  /** Droits IA (Site Pro) calculés côté serveur ; revérifiés à chaque demande. */
  iaComplete: boolean;
  restantsIa: RestantsIa;
  /** `?creation=1` : questionnaire de la création assistée (IA_SITE §3.1). */
  questionnaire?: { questions: QuestionCreation[]; repris: string[] };
  /** Aperçu gratuit de l'accueil déjà généré, en attente de Site Pro. */
  apercuInitial: OperationIa[] | null;
  /** Site Pro actif et création en attente : `auto` si l'artisan revient du paiement. */
  reprise: 'non' | 'proposee' | 'auto';
  /** Articles publiés : aperçu de l'élément « Articles du blog ». */
  blog: { articles: ArticleRendu[]; classement: ClassementRendu };
}
