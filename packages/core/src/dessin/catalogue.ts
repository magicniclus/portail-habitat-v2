/**
 * Catalogue d'objets de Dessin (DES-21 à DES-24) : objets paramétrables posés sur le plan.
 * Dimensions en mm (largeur l, profondeur p, hauteur h). Le modèle 3D viendra au lot 15g ;
 * en 2D, chaque objet est dessiné par son `symbole`. Données d'origine Portail Travaux (D88).
 */
export const CATEGORIES_OBJETS = [
  'cuisine',
  'salle_de_bain',
  'chambre',
  'dressing',
  'enfant',
  'bureau',
  'sejour',
  'deco',
  'electricite',
  'chauffage',
  'exterieur',
] as const;
export type CategorieObjet = (typeof CATEGORIES_OBJETS)[number];

export const LIBELLES_CATEGORIE: Record<CategorieObjet, string> = {
  cuisine: 'Cuisine',
  salle_de_bain: 'Salle de bain',
  chambre: 'Chambre',
  dressing: 'Dressing',
  enfant: 'Chambre d’enfant',
  bureau: 'Bureau',
  sejour: 'Séjour et mobilier',
  deco: 'Luminaires et déco',
  electricite: 'Électricité',
  chauffage: 'Plomberie et chauffage',
  exterieur: 'Extérieur',
};

/** Forme dessinée en 2D (vue de dessus). */
export type SymboleObjet =
  | 'rectangle'
  | 'rond'
  | 'meuble_bas'
  | 'meuble_haut'
  | 'colonne'
  | 'evier'
  | 'plaque'
  | 'frigo'
  | 'lave_vaisselle'
  | 'hotte'
  | 'baignoire'
  | 'douche'
  | 'vasque'
  | 'wc'
  | 'lit'
  | 'canape'
  | 'table'
  | 'table_ronde'
  | 'chaise'
  | 'armoire'
  | 'tapis'
  | 'prise'
  | 'interrupteur'
  | 'point_lumineux'
  | 'radiateur'
  | 'plante';

/** Rôle d'un meuble de cuisine : plan de travail, triangle d'activité (DES-23). */
export type ModuleCuisine = 'bas' | 'haut' | 'colonne' | 'evier' | 'plaque' | 'frigo';

export interface ObjetCatalogue {
  id: string;
  libelle: string;
  categorie: CategorieObjet;
  symbole: SymboleObjet;
  dimensions: { l: number; p: number; h: number };
  /** Plages réglables ; absentes = dimension fixe à ±50 %. */
  plages?: { l?: [number, number]; p?: [number, number]; h?: [number, number] };
  /** Posé contre un mur (dos au mur) quand on le place près d'un mur. */
  contreMur?: boolean;
  /** Hauteur de pose (meubles hauts, prises, luminaires), en mm. */
  altitude?: number;
  cuisine?: ModuleCuisine;
  /** Prestation du catalogue Portail Travaux pour le métré (docs/data/prestations-catalogue.json). */
  prestationId?: string;
}

type Ligne = [
  id: string,
  libelle: string,
  symbole: SymboleObjet,
  l: number,
  p: number,
  h: number,
  options?: Partial<
    Pick<ObjetCatalogue, 'plages' | 'contreMur' | 'altitude' | 'cuisine' | 'prestationId'>
  >,
];

const MUR = { contreMur: true } as const;
const largeurModule: Pick<ObjetCatalogue, 'plages'> = { plages: { l: [150, 1200] } };

const PAR_CATEGORIE: Record<CategorieObjet, Ligne[]> = {
  cuisine: [
    [
      'meuble-bas-60',
      'Meuble bas',
      'meuble_bas',
      600,
      600,
      870,
      { ...MUR, ...largeurModule, cuisine: 'bas', prestationId: 'cuisine-pose' },
    ],
    [
      'meuble-bas-angle',
      'Meuble bas d’angle',
      'meuble_bas',
      900,
      900,
      870,
      { ...MUR, cuisine: 'bas', prestationId: 'cuisine-pose' },
    ],
    [
      'evier-120',
      'Meuble évier',
      'evier',
      1200,
      600,
      870,
      { ...MUR, ...largeurModule, cuisine: 'evier', prestationId: 'cuisine-pose' },
    ],
    [
      'plaque-60',
      'Plaque de cuisson',
      'plaque',
      600,
      600,
      870,
      { ...MUR, cuisine: 'plaque', prestationId: 'cuisine-pose' },
    ],
    [
      'lave-vaisselle',
      'Lave-vaisselle',
      'lave_vaisselle',
      600,
      600,
      850,
      { ...MUR, cuisine: 'bas' },
    ],
    [
      'meuble-haut-60',
      'Meuble haut',
      'meuble_haut',
      600,
      350,
      700,
      { ...MUR, ...largeurModule, altitude: 1450, cuisine: 'haut', prestationId: 'cuisine-pose' },
    ],
    ['hotte-60', 'Hotte', 'hotte', 600, 500, 700, { ...MUR, altitude: 1550, cuisine: 'haut' }],
    [
      'colonne-60',
      'Colonne four',
      'colonne',
      600,
      600,
      2150,
      { ...MUR, cuisine: 'colonne', prestationId: 'cuisine-pose' },
    ],
    ['refrigerateur', 'Réfrigérateur', 'frigo', 600, 650, 1850, { ...MUR, cuisine: 'frigo' }],
    [
      'ilot',
      'Îlot central',
      'table',
      1800,
      900,
      900,
      { plages: { l: [1000, 3000], p: [600, 1200] }, cuisine: 'bas', prestationId: 'cuisine-pose' },
    ],
  ],
  salle_de_bain: [
    [
      'baignoire',
      'Baignoire',
      'baignoire',
      1700,
      700,
      550,
      { ...MUR, plages: { l: [1400, 1900], p: [700, 900] } },
    ],
    [
      'douche-italienne',
      'Douche à l’italienne',
      'douche',
      1200,
      900,
      0,
      { ...MUR, plages: { l: [800, 1800], p: [800, 1200] }, prestationId: 'sdb-douche' },
    ],
    ['vasque', 'Meuble vasque', 'vasque', 800, 500, 850, { ...MUR, plages: { l: [600, 1000] } }],
    [
      'double-vasque',
      'Double vasque',
      'vasque',
      1400,
      500,
      850,
      { ...MUR, plages: { l: [1200, 1800] } },
    ],
    ['wc-suspendu', 'WC suspendu', 'wc', 380, 550, 400, { ...MUR, prestationId: 'wc' }],
    [
      'seche-serviettes',
      'Sèche-serviettes',
      'radiateur',
      500,
      100,
      1200,
      { ...MUR, altitude: 300 },
    ],
    ['lave-linge', 'Lave-linge', 'rectangle', 600, 600, 850, MUR],
  ],
  chambre: [
    ['lit-140', 'Lit 140 × 190', 'lit', 1400, 1900, 450, MUR],
    ['lit-160', 'Lit 160 × 200', 'lit', 1600, 2000, 450, MUR],
    ['lit-90', 'Lit 90 × 190', 'lit', 900, 1900, 450, MUR],
    ['chevet', 'Table de chevet', 'rectangle', 450, 400, 550, MUR],
    ['armoire', 'Armoire', 'armoire', 1200, 600, 2200, { ...MUR, plages: { l: [800, 2400] } }],
    ['commode', 'Commode', 'rectangle', 1000, 500, 850, MUR],
  ],
  dressing: [
    [
      'penderie',
      'Penderie',
      'armoire',
      1000,
      600,
      2200,
      { ...MUR, plages: { l: [500, 2000] }, prestationId: 'dressing' },
    ],
    [
      'etageres',
      'Module étagères',
      'armoire',
      800,
      400,
      2200,
      { ...MUR, plages: { l: [400, 1600] }, prestationId: 'dressing' },
    ],
  ],
  enfant: [
    ['lit-bebe', 'Lit bébé', 'lit', 600, 1200, 900, MUR],
    ['lit-enfant', 'Lit enfant 90 × 190', 'lit', 900, 1900, 450, MUR],
    ['bureau-enfant', 'Bureau enfant', 'table', 1000, 500, 650, MUR],
  ],
  bureau: [
    ['bureau', 'Bureau', 'table', 1400, 700, 750, { ...MUR, plages: { l: [1000, 2000] } }],
    ['chaise-bureau', 'Chaise de bureau', 'chaise', 600, 600, 1000],
    [
      'bibliotheque',
      'Bibliothèque',
      'armoire',
      900,
      350,
      2000,
      { ...MUR, plages: { l: [600, 2400] } },
    ],
  ],
  sejour: [
    [
      'canape-3',
      'Canapé 3 places',
      'canape',
      2200,
      950,
      850,
      { ...MUR, plages: { l: [1600, 2800] } },
    ],
    ['canape-angle', 'Canapé d’angle', 'canape', 2600, 2000, 850, MUR],
    ['fauteuil', 'Fauteuil', 'canape', 850, 850, 850],
    ['table-basse', 'Table basse', 'table', 1100, 600, 400],
    [
      'table-6',
      'Table 6 personnes',
      'table',
      1800,
      900,
      750,
      { plages: { l: [1200, 2600], p: [800, 1100] } },
    ],
    [
      'table-ronde',
      'Table ronde',
      'table_ronde',
      1200,
      1200,
      750,
      { plages: { l: [900, 1600], p: [900, 1600] } },
    ],
    ['chaise', 'Chaise', 'chaise', 450, 500, 900],
    ['buffet', 'Buffet', 'rectangle', 1800, 450, 850, MUR],
    ['meuble-tv', 'Meuble TV', 'rectangle', 1600, 400, 500, MUR],
  ],
  deco: [
    ['suspension', 'Suspension', 'point_lumineux', 500, 500, 300, { altitude: 2000 }],
    ['lampadaire', 'Lampadaire', 'rond', 400, 400, 1700],
    ['tapis', 'Tapis', 'tapis', 2000, 1400, 10, { plages: { l: [600, 4000], p: [600, 4000] } }],
    ['plante', 'Plante', 'plante', 500, 500, 1200],
    ['miroir', 'Miroir', 'rectangle', 800, 30, 1200, { ...MUR, altitude: 900 }],
  ],
  electricite: [
    [
      'prise',
      'Prise',
      'prise',
      80,
      40,
      80,
      { ...MUR, altitude: 300, prestationId: 'prises-eclairage' },
    ],
    [
      'interrupteur',
      'Interrupteur',
      'interrupteur',
      80,
      40,
      80,
      { ...MUR, altitude: 1100, prestationId: 'prises-eclairage' },
    ],
    [
      'point-lumineux',
      'Point lumineux',
      'point_lumineux',
      150,
      150,
      100,
      { altitude: 2400, prestationId: 'prises-eclairage' },
    ],
    [
      'tableau-electrique',
      'Tableau électrique',
      'rectangle',
      500,
      150,
      900,
      { ...MUR, altitude: 1000, prestationId: 'tableau-electrique' },
    ],
  ],
  chauffage: [
    [
      'radiateur',
      'Radiateur',
      'radiateur',
      1000,
      100,
      600,
      { ...MUR, altitude: 150, plages: { l: [400, 2000] }, prestationId: 'chauffage-electrique' },
    ],
    [
      'chaudiere',
      'Chaudière murale',
      'rectangle',
      450,
      350,
      700,
      { ...MUR, altitude: 1100, prestationId: 'chaudiere' },
    ],
    [
      'ballon',
      'Ballon d’eau chaude',
      'rond',
      550,
      550,
      1500,
      { ...MUR, prestationId: 'chauffe-eau' },
    ],
    ['poele', 'Poêle', 'rond', 600, 600, 1000, { prestationId: 'poele' }],
  ],
  exterieur: [
    ['salon-jardin', 'Salon de jardin', 'table_ronde', 2000, 2000, 750],
    [
      'abri-jardin',
      'Abri de jardin',
      'rectangle',
      2500,
      2000,
      2200,
      { prestationId: 'abri-jardin' },
    ],
    ['barbecue', 'Barbecue', 'rectangle', 1200, 600, 1000],
    [
      'arbre',
      'Arbre',
      'plante',
      3000,
      3000,
      6000,
      { plages: { l: [1000, 10000], p: [1000, 10000] } },
    ],
  ],
};

export const CATALOGUE_OBJETS: readonly ObjetCatalogue[] = Object.entries(PAR_CATEGORIE).flatMap(
  ([categorie, lignes]) =>
    lignes.map(([id, libelle, symbole, l, p, h, options]) => ({
      id,
      libelle,
      categorie: categorie as CategorieObjet,
      symbole,
      dimensions: { l, p, h },
      ...options,
    })),
);

const INDEX = new Map(CATALOGUE_OBJETS.map((o) => [o.id, o]));
export const objetDuCatalogue = (id: string): ObjetCatalogue | undefined => INDEX.get(id);

/** Plages effectives d'un objet (±50 % autour des dimensions par défaut si non précisées). */
export function plagesDe(o: ObjetCatalogue): Record<'l' | 'p' | 'h', [number, number]> {
  const auto = (v: number): [number, number] => [
    Math.max(1, Math.round(v / 2)),
    Math.round(v * 1.5) || 3_000,
  ];
  return {
    l: o.plages?.l ?? auto(o.dimensions.l),
    p: o.plages?.p ?? auto(o.dimensions.p),
    h: o.plages?.h ?? [0, Math.max(3_000, o.dimensions.h * 2)],
  };
}

/** Recherche plein texte, sans accents ni casse (DES-21). */
export function chercherObjets(texte: string): ObjetCatalogue[] {
  const net = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const mots = net(texte).split(/\s+/).filter(Boolean);
  if (mots.length === 0) return [];
  return CATALOGUE_OBJETS.filter((o) => {
    const t = net(`${o.libelle} ${LIBELLES_CATEGORIE[o.categorie]}`);
    return mots.every((m) => t.includes(m));
  });
}
