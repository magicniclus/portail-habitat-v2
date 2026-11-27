import type { DroitsFormule } from '../../paiements/droits';

/**
 * Réglages de l'IA du site (IA_SITE §1 et §4). Décisions encore ⏳ dans DECISIONS.md :
 * D48 (essai gratuit), D50 (modèles), D51 (quotas) — valeurs du document, à confirmer.
 */
export const MODES_IA_SITE = ['textes', 'composant', 'page', 'seo', 'theme'] as const;
export type ModeIaSite = (typeof MODES_IA_SITE)[number];
export type CategorieIaSite = 'creation' | 'composants' | 'textes';

export const CATEGORIE_MODE: Record<ModeIaSite, CategorieIaSite> = {
  textes: 'textes',
  seo: 'textes',
  composant: 'composants',
  page: 'composants',
  theme: 'composants',
};

/** D50 ⏳ : Sonnet pour les pages (et la création complète), Haiku pour le reste. */
export const MODELE_MODE: Record<ModeIaSite, 'claude-haiku-5-5' | 'claude-sonnet-5-5'> = {
  textes: 'claude-haiku-5-5',
  seo: 'claude-haiku-5-5',
  composant: 'claude-haiku-5-5',
  theme: 'claude-haiku-5-5',
  page: 'claude-sonnet-5-5',
};

/** D51 ⏳ : quotas mensuels Site Pro, doublés avec Tout inclus (multiplicateur des droits). */
export const QUOTAS_MOIS_SITE_PRO: Record<CategorieIaSite, number> = {
  creation: 5,
  composants: 60,
  textes: 300,
};
/** D48 ⏳ : compte sans Site Pro, 3 améliorations de texte à vie. */
export const ESSAIS_TEXTES_A_VIE = 3;

/** Limite d'opérations par réponse (création complète : 400). */
export const MAX_OPERATIONS = { creation: 400, autre: 60 } as const;

/**
 * Crédit à consommer pour une demande : quota du mois (Site Pro) ou essai à vie (textes seulement).
 * `null` : la fonction est réservée à Site Pro (fenêtre d'offre côté écran, refus côté serveur).
 */
export function creditIaSite(
  droits: Pick<DroitsFormule, 'iaSite' | 'iaMultiplicateur'>,
  mode: ModeIaSite,
):
  | { type: 'mois'; categorie: CategorieIaSite; max: number }
  | { type: 'essai'; max: number }
  | null {
  const categorie = CATEGORIE_MODE[mode];
  if (droits.iaSite === 'complet')
    return {
      type: 'mois',
      categorie,
      max: QUOTAS_MOIS_SITE_PRO[categorie] * droits.iaMultiplicateur,
    };
  return categorie === 'textes' ? { type: 'essai', max: ESSAIS_TEXTES_A_VIE } : null;
}
