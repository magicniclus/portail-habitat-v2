import type { StatutProjetStudio } from './catalogue';
import type { EtatCaptures } from './preparation';

/**
 * Pages d'un projet Studio (STUDIO.md) : une page par étape, dans l'ordre. On ouvre un projet
 * sur l'étape en cours ; les suivantes s'ouvrent quand la précédente a produit son résultat.
 */
export const ETAPES_PROJET = ['idees', 'captures', 'tournage', 'montage', 'publication'] as const;
export type EtapeProjet = (typeof ETAPES_PROJET)[number];

export const LIBELLES_ETAPE_PROJET: Readonly<Record<EtapeProjet, string>> = {
  idees: 'Idée et script',
  captures: 'Captures',
  tournage: 'Tournage',
  montage: 'Montage',
  publication: 'Publication',
};

interface EtatProjet {
  statut: StatutProjetStudio;
  /** Une prise existe (voix, vidéo ou « Claude fait tout »). */
  prise: boolean;
  /** Une vidéo finale existe. */
  rendu: boolean;
  /** Captures d'écran préparées et filmées avant le tournage. */
  captures: EtatCaptures;
}

export function etapeProjet(p: EtatProjet): EtapeProjet {
  if (p.statut === 'sujet') return 'idees';
  if (!p.prise) {
    const aFaire = p.captures === 'a_preparer' || p.captures === 'preparee';
    return aFaire || p.statut === 'captures' || p.statut === 'erreur' ? 'captures' : 'tournage';
  }
  return p.statut === 'pret' && p.rendu ? 'publication' : 'montage';
}

export function etapesAccessibles(p: EtatProjet): EtapeProjet[] {
  return ETAPES_PROJET.filter(
    (e) =>
      e === 'idees' ||
      ((e === 'captures' || e === 'tournage') && p.statut !== 'sujet') ||
      (e === 'montage' && p.prise) ||
      (e === 'publication' && p.rendu),
  );
}
