import type { StatutProjetStudio } from './catalogue';

/**
 * Pages d'un projet Studio (STUDIO.md) : l'idée et son script, puis le Studio (éditeur plein
 * écran où l'on tourne, filme les écrans de Portail Travaux et monte), puis la publication.
 */
export const ETAPES_PROJET = ['idees', 'montage', 'publication'] as const;
export type EtapeProjet = (typeof ETAPES_PROJET)[number];

export const LIBELLES_ETAPE_PROJET: Readonly<Record<EtapeProjet, string>> = {
  idees: 'Idée et script',
  montage: 'Studio',
  publication: 'Publication',
};

interface EtatProjet {
  statut: StatutProjetStudio;
  /** Une vidéo finale existe. */
  rendu: boolean;
  /** Montage libre : ouvert directement dans le Studio, sans idée. */
  libre?: boolean;
}

export function etapeProjet(p: EtatProjet): EtapeProjet {
  if (!p.libre && p.statut === 'sujet') return 'idees';
  return p.statut === 'pret' && p.rendu ? 'publication' : 'montage';
}

export function etapesAccessibles(p: EtatProjet): EtapeProjet[] {
  return ETAPES_PROJET.filter(
    (e) =>
      (e === 'idees' && !p.libre) ||
      (e === 'montage' && (p.libre || p.statut !== 'sujet')) ||
      (e === 'publication' && p.rendu),
  );
}
