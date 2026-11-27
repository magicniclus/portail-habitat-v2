import type { Piece, Point } from '../schemas/dessinScene';

/**
 * Modèles de départ (DES-01) : un rectangle hors tout, des cloisons et le type de chaque pièce,
 * posé à un point qui lui appartient. Tout reste modifiable ensuite. Millimètres ; les murs
 * extérieurs font 20 cm, leurs axes sont à 10 cm du bord.
 */
export interface NiveauModele {
  cloisons: [Point, Point][];
  pieces: [Point, Piece['type']][];
}
export interface Modele {
  id: 'studio' | 't2' | 't3' | 'plain_pied' | 'etage';
  libelle: string;
  detail: string;
  largeur: number;
  profondeur: number;
  niveaux: NiveauModele[];
}
const p = (x: number, y: number): Point => ({ x, y });

export const MODELES: readonly Modele[] = [
  {
    id: 'studio',
    libelle: 'Studio',
    detail: '6 × 4,5 m : pièce de vie et salle d’eau',
    largeur: 6_000,
    profondeur: 4_500,
    niveaux: [
      {
        cloisons: [
          [p(4_400, 100), p(4_400, 2_200)],
          [p(4_400, 2_200), p(5_900, 2_200)],
        ],
        pieces: [
          [p(2_000, 2_200), 'sejour'],
          [p(5_100, 1_100), 'salle_d_eau'],
        ],
      },
    ],
  },
  {
    id: 't2',
    libelle: 'T2',
    detail: '8 × 6 m : séjour, chambre, salle de bains',
    largeur: 8_000,
    profondeur: 6_000,
    niveaux: [
      {
        cloisons: [
          [p(5_000, 100), p(5_000, 5_900)],
          [p(5_000, 2_500), p(7_900, 2_500)],
        ],
        pieces: [
          [p(2_500, 3_000), 'sejour'],
          [p(6_500, 1_200), 'salle_de_bain'],
          [p(6_500, 4_200), 'chambre'],
        ],
      },
    ],
  },
  {
    id: 't3',
    libelle: 'T3',
    detail: '10 × 7 m : séjour, deux chambres, salle de bains',
    largeur: 10_000,
    profondeur: 7_000,
    niveaux: [
      {
        cloisons: [
          [p(6_000, 100), p(6_000, 6_900)],
          [p(6_000, 3_500), p(9_900, 3_500)],
          [p(100, 2_500), p(2_500, 2_500)],
          [p(2_500, 100), p(2_500, 2_500)],
        ],
        pieces: [
          [p(4_000, 4_500), 'sejour'],
          [p(1_200, 1_200), 'salle_de_bain'],
          [p(8_000, 1_800), 'chambre'],
          [p(8_000, 5_200), 'chambre'],
        ],
      },
    ],
  },
  {
    id: 'plain_pied',
    libelle: 'Maison de plain-pied',
    detail: '12 × 9 m : séjour, cuisine, deux chambres, salle de bains',
    largeur: 12_000,
    profondeur: 9_000,
    niveaux: [
      {
        cloisons: [
          [p(7_000, 100), p(7_000, 8_900)],
          [p(7_000, 3_000), p(11_900, 3_000)],
          [p(7_000, 6_000), p(11_900, 6_000)],
          [p(100, 3_500), p(3_500, 3_500)],
          [p(3_500, 100), p(3_500, 3_500)],
        ],
        pieces: [
          [p(4_000, 6_000), 'sejour'],
          [p(1_800, 1_800), 'cuisine'],
          [p(9_500, 1_500), 'chambre'],
          [p(9_500, 4_500), 'salle_de_bain'],
          [p(9_500, 7_500), 'chambre'],
        ],
      },
    ],
  },
  {
    id: 'etage',
    libelle: 'Maison à étage',
    detail: '9 × 8 m : séjour, cuisine et entrée en bas ; deux chambres et salle de bains en haut',
    largeur: 9_000,
    profondeur: 8_000,
    niveaux: [
      {
        cloisons: [
          [p(5_500, 100), p(5_500, 7_900)],
          [p(5_500, 4_000), p(8_900, 4_000)],
        ],
        pieces: [
          [p(2_500, 4_000), 'sejour'],
          [p(7_200, 2_000), 'cuisine'],
          [p(7_200, 6_000), 'entree'],
        ],
      },
      {
        cloisons: [
          [p(4_500, 100), p(4_500, 7_900)],
          [p(4_500, 4_500), p(8_900, 4_500)],
        ],
        pieces: [
          [p(2_200, 4_000), 'chambre'],
          [p(6_700, 2_200), 'chambre'],
          [p(6_700, 6_200), 'salle_de_bain'],
        ],
      },
    ],
  },
];
