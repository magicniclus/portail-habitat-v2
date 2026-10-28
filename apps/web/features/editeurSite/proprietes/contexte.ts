import type { Action, Appareil, PageSite, Theme } from '@ph/core/sites';

export const NOMS_APPAREIL: Record<Appareil, string> = {
  desktop: 'Ordinateur',
  tablet: 'Tablette',
  mobile: 'Mobile',
};

/** Ce dont les réglages de chaque niveau ont besoin, fourni par l'éditeur. */
export interface ContexteReglages {
  pages: Record<string, PageSite>;
  palette: Theme['palette'];
  appareil: Appareil;
  medias: Record<string, string>;
  artisanId: string;
  onMedia: (cle: string, url: string) => void;
  erreurAction: (a: Action) => string | null;
  categoriesBlog: { id: string; nom: string }[];
  /** Réglages fusionnés dans le nœud sélectionné (`w` pour la largeur d'un bloc). */
  maj: (reglages: Record<string, unknown>) => void;
  /** Ouvre le panneau Ajouter sur l'onglet voulu. */
  ouvrirAjout: (onglet: 'zones' | 'sections' | 'contenus') => void;
  /** Change l'appareil de l'aperçu (« Voir l'aperçu mobile »). */
  onAppareil: (a: Appareil) => void;
  /** Ouvre ou ferme le menu mobile dans l'aperçu. */
  basculerMenu: () => void;
}

/** Valeur par appareil modifiée pour l'appareil affiché seulement (SITE-02). */
export const pourAppareil = <T>(v: Record<Appareil, T>, a: Appareil, x: T) => ({ ...v, [a]: x });
