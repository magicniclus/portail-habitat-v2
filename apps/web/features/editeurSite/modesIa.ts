import { CATEGORIE_MODE, type ModeIaSite } from '@ph/core/sites';

export interface RestantsIa {
  type: 'mois' | 'essai';
  textes: number;
  composants: number;
  max: { textes: number; composants: number };
}

export const MODES: { mode: ModeIaSite | 'auto'; libelle: string; essai: boolean }[] = [
  { mode: 'auto', libelle: 'Automatique (l’IA choisit)', essai: true },
  { mode: 'textes', libelle: 'Améliorer les textes', essai: true },
  { mode: 'seo', libelle: 'Référencement (titres, descriptions)', essai: true },
  { mode: 'composant', libelle: 'Créer ou modifier des sections', essai: false },
  { mode: 'page', libelle: 'Créer ou refaire une page', essai: false },
  { mode: 'theme', libelle: 'Couleurs et polices', essai: false },
];

/** « 52 modifications restantes ce mois-ci » (IA_SITE §4), selon l'action choisie. */
export function texteRestants(r: RestantsIa, mode: ModeIaSite | 'auto'): string {
  if (r.type === 'essai')
    return r.textes > 1
      ? `${r.textes} essais gratuits restants`
      : r.textes === 1
        ? '1 essai gratuit restant'
        : 'Essais gratuits utilisés';
  if (mode === 'auto')
    return `Ce mois-ci : ${r.textes} retouches de texte et ${r.composants} sections ou pages restantes`;
  const n = CATEGORIE_MODE[mode] === 'textes' ? r.textes : r.composants;
  return `${n} modification${n > 1 ? 's' : ''} restante${n > 1 ? 's' : ''} ce mois-ci`;
}
