import type { Piece, Point, Revetement } from '../schemas/dessinScene';
import type { TypeOuverture } from './ouvertures';

/** Données de la maison de démonstration en L (demo.ts) : axes des murs, en millimètres. */
const p = (x: number, y: number): Point => ({ x, y });

const CLOISONS: [Point, Point][] = [
  [p(4_000, 100), p(4_000, 5_000)],
  [p(100, 5_000), p(7_900, 5_000)],
  [p(3_000, 5_000), p(3_000, 9_500)],
  [p(100, 8_000), p(3_000, 8_000)],
  [p(100, 9_500), p(3_000, 9_500)],
  [p(10_000, 5_100), p(10_000, 8_000)],
  [p(10_000, 8_000), p(12_900, 8_000)],
];
const PIECES: [Point, Piece['type']][] = [
  [p(2_000, 2_500), 'chambre'],
  [p(6_000, 2_500), 'chambre'],
  [p(1_500, 6_500), 'salle_de_bain'],
  [p(1_500, 8_750), 'wc'],
  [p(11_400, 6_500), 'cuisine'],
  [p(6_000, 8_500), 'sejour'],
];
const OUVERTURES: [Point, TypeOuverture][] = [
  [p(3_300, 5_000), 'porte'],
  [p(7_300, 5_000), 'porte'],
  [p(3_000, 6_500), 'porte'],
  [p(3_000, 8_750), 'porte'],
  [p(10_000, 6_500), 'ouverture_libre'],
  [p(1_500, 10_900), 'porte_entree'],
  [p(6_000, 10_900), 'porte_fenetre'],
  [p(12_900, 9_500), 'baie_coulissante'],
  [p(2_000, 100), 'fenetre_double'],
  [p(6_000, 100), 'fenetre_double'],
  [p(11_400, 5_100), 'fenetre'],
  [p(100, 6_500), 'fenetre'],
];
/** Objets du catalogue : position voulue (placés contre le mur le plus proche), demi-tours. */
const OBJETS: [string, Point, number?][] = [
  ['lit-160', p(2_000, 1_400)],
  ['chevet', p(700, 400)],
  ['chevet', p(3_300, 400)],
  ['armoire', p(1_300, 4_600)],
  ['lit-140', p(6_000, 1_400)],
  ['chevet', p(4_600, 400)],
  ['commode', p(7_500, 3_000)],
  ['baignoire', p(1_500, 5_400)],
  ['vasque', p(400, 7_300)],
  ['seche-serviettes', p(1_500, 7_800)],
  ['wc-suspendu', p(400, 8_750)],
  ['meuble-bas-60', p(10_400, 5_400)],
  ['evier-120', p(11_300, 5_400)],
  ['lave-vaisselle', p(12_300, 5_400)],
  ['plaque-60', p(12_600, 6_300)],
  ['hotte-60', p(12_600, 6_300)],
  ['meuble-haut-60', p(10_400, 5_400)],
  ['refrigerateur', p(12_600, 7_500)],
  ['meuble-tv', p(5_600, 5_300)],
  ['canape-3', p(5_600, 7_700), 1_800],
  ['table-basse', p(5_600, 6_600)],
  ['fauteuil', p(7_300, 6_800)],
  ['table-6', p(9_000, 9_300)],
  ['chaise', p(8_400, 8_500)],
  ['chaise', p(9_600, 8_500)],
  ['chaise', p(8_400, 10_100), 1_800],
  ['chaise', p(9_600, 10_100), 1_800],
  ['suspension', p(9_000, 9_300)],
  ['buffet', p(11_500, 10_500)],
  ['bibliotheque', p(4_700, 10_500)],
  ['plante', p(7_500, 10_400)],
  ['plante', p(12_500, 8_400)],
  ['salon-jardin', p(6_500, 12_700)],
  ['barbecue', p(8_600, 13_400)],
];
export const sol = (
  famille: Revetement['famille'],
  materiauId: string,
  pose?: Revetement['pose'],
): Revetement => ({
  famille,
  materiauId,
  ...(pose ? { pose } : {}),
});
export const SOLS: Partial<Record<Piece['type'], Revetement>> = {
  sejour: sol('parquet', 'pa-chene-clair', 'decalee'),
  chambre: sol('parquet', 'pa-chene-naturel', 'decalee'),
  cuisine: sol('carrelage', 'ca-gris-60', 'droite'),
  salle_de_bain: sol('carrelage', 'ca-gris-60', 'droite'),
  wc: sol('carrelage', 'ca-gris-60', 'droite'),
  salle_d_eau: sol('carrelage', 'ca-gris-60', 'droite'),
  bureau: sol('parquet', 'pa-noyer', 'decalee'),
  couloir: sol('parquet', 'pa-chene-clair', 'decalee'),
};

/** Escalier droit du séjour, contre la salle de bains : monte à l'étage (trémie automatique). */
export const ESCALIER = { position: p(3_200, 5_200) };

/** Aménagement d'un niveau : cloisons, pièces typées, ouvertures, objets. */
export interface PlanNiveau {
  cloisons: [Point, Point][];
  pieces: [Point, Piece['type']][];
  ouvertures: [Point, TypeOuverture][];
  objets: [string, Point, number?][];
}

export const RDC: PlanNiveau = {
  cloisons: CLOISONS,
  pieces: PIECES,
  ouvertures: OUVERTURES,
  objets: OBJETS,
};

/** Étage sur toute l'emprise : deux chambres, suite parentale, salle d'eau, bureau, palier. */
export const ETAGE: PlanNiveau = {
  cloisons: [
    [p(4_000, 100), p(4_000, 5_000)],
    [p(100, 5_000), p(7_900, 5_000)],
    [p(3_000, 5_000), p(3_000, 10_900)],
    [p(100, 8_000), p(3_000, 8_000)],
    [p(6_000, 5_000), p(6_000, 10_900)],
  ],
  pieces: [
    [p(2_000, 2_500), 'chambre'],
    [p(6_000, 2_500), 'chambre'],
    [p(1_500, 6_500), 'salle_d_eau'],
    [p(1_500, 9_500), 'bureau'],
    [p(4_500, 9_800), 'couloir'],
    [p(9_500, 8_000), 'chambre'],
  ],
  ouvertures: [
    [p(3_500, 5_000), 'porte'],
    [p(5_000, 5_000), 'porte'],
    [p(3_000, 6_500), 'porte'],
    [p(3_000, 9_000), 'porte'],
    [p(6_000, 9_800), 'porte'],
    [p(2_000, 100), 'fenetre_double'],
    [p(6_000, 100), 'fenetre_double'],
    [p(100, 6_500), 'fenetre'],
    [p(100, 9_500), 'fenetre'],
    [p(4_500, 10_900), 'fenetre'],
    [p(12_900, 8_000), 'fenetre_double'],
    [p(9_500, 10_900), 'fenetre_double'],
    [p(10_500, 5_100), 'fenetre'],
  ],
  objets: [
    ['lit-140', p(2_000, 1_400)],
    ['chevet', p(700, 400)],
    ['commode', p(3_300, 4_600)],
    ['lit-90', p(5_200, 1_200)],
    ['bureau-enfant', p(7_300, 2_500)],
    ['douche-italienne', p(1_500, 5_500)],
    ['vasque', p(400, 7_300)],
    ['wc-suspendu', p(2_700, 7_600)],
    ['bureau', p(1_500, 10_500)],
    ['chaise-bureau', p(1_500, 9_800)],
    ['bibliotheque', p(400, 9_000)],
    ['lit-160', p(10_500, 5_600)],
    ['chevet', p(9_300, 5_400)],
    ['chevet', p(11_700, 5_400)],
    ['armoire', p(7_000, 8_000)],
    ['fauteuil', p(12_300, 10_300)],
    ['plante', p(5_600, 10_500)],
  ],
};
