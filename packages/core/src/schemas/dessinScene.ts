import { z } from '../zod';

/**
 * Scène d'un plan Dessin (DESSIN.md §2-3). Longueurs en MILLIMÈTRES ENTIERS,
 * angles en DIXIÈMES DE DEGRÉ entiers : aucun flottant n'est stocké.
 */
export const SCENE_VERSION = 1;

/** ± 1 km : largement au-delà d'une parcelle, en deçà de toute erreur d'arrondi. */
export const LIMITE_MM = 1_000_000;
export const mm = z.number().int().min(-LIMITE_MM).max(LIMITE_MM);
const mmPositif = z.number().int().min(0).max(LIMITE_MM);
/** Dixièmes de degré, de -360° à 360°. */
export const angle = z.number().int().min(-3600).max(3600);

export const point = z.object({ x: mm, y: mm });
export const polygone = z.array(point).min(3).max(500);

const identifiant = (prefixe: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefixe}_[A-Za-z0-9_-]{4,24}$`), 'Identifiant d’élément invalide');

export const FAMILLES_REVETEMENT = [
  'aucun',
  'peinture',
  'papier_peint',
  'carrelage',
  'faience',
  'parquet',
  'stratifie',
  'vinyle',
  'moquette',
  'beton_cire',
  'parement',
  'enduit',
  'bardage',
  'tuile',
  'ardoise',
  'zinc',
  'bac_acier',
  'vegetalise',
  'bois',
  'composite',
  'dalle',
  'gazon',
  'gravier',
  'liner',
  'pierre',
] as const;

/** Poses de carrelage et de parquet (DES-26). */
const POSES = [
  'droite',
  'decalee',
  'diagonale',
  'chevron',
  'point_de_hongrie',
  'baton_rompu',
] as const;

/** Finitions d'une peinture (DES-25). */
export const FINITIONS_PEINTURE = ['mat', 'satin', 'brillant'] as const;

export const revetement = z.object({
  famille: z.enum(FAMILLES_REVETEMENT),
  /** Référence dans `referentiel/materiaux` (lot 15f). */
  materiauId: z.string().min(1).max(64).optional(),
  couleur: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, 'Couleur invalide')
    .optional(),
  orientation: angle.optional(),
  joint: z
    .object({
      largeur: mmPositif.max(50),
      couleur: z
        .string()
        .regex(/^#[0-9a-f]{6}$/i, 'Couleur invalide')
        .optional(),
    })
    .optional(),
  /** Carrelage, dalles : format d'un élément ; parquet : largeur et longueur de lame (mm). */
  format: z.object({ l: mmPositif.min(10).max(3_000), p: mmPositif.min(10).max(3_000) }).optional(),
  pose: z.enum(POSES).optional(),
  /** Peinture (DES-25) : mat, satin ou brillant ; mat si absent. */
  finition: z.enum(FINITIONS_PEINTURE).optional(),
});
const REVETEMENT_VIDE = { famille: 'aucun' } as const;

const TYPES_MUR = [
  'mur',
  'cloison',
  'demi_mur',
  'muret',
  'separation',
  'poteau',
  'poutre',
] as const;

export const mur = z
  .object({
    id: identifiant('m'),
    a: point,
    b: point,
    epaisseur: mmPositif.max(1_000),
    hauteur: mmPositif.max(20_000),
    /** Hauteur à l'extrémité b si elle diffère (mur rampant). */
    hauteurB: mmPositif.max(20_000).optional(),
    type: z.enum(TYPES_MUR),
    porteur: z.boolean().default(false),
    alignement: z.enum(['axe', 'gauche', 'droite']).default('axe'),
    faceA: revetement.default(REVETEMENT_VIDE),
    faceB: revetement.default(REVETEMENT_VIDE),
    verrouille: z.boolean().default(false),
  })
  .refine((m) => m.a.x !== m.b.x || m.a.y !== m.b.y, 'Un mur doit avoir une longueur');

const TYPES_OUVERTURE = [
  'porte',
  'porte_double',
  'porte_coulissante',
  'porte_galandage',
  'porte_galandage_double',
  'porte_pivot',
  'porte_entree',
  'porte_garage',
  'fenetre',
  'fenetre_double',
  'fenetre_oscillo',
  'fenetre_fixe',
  'oeil_de_boeuf',
  'porte_fenetre',
  'baie_coulissante',
  'ouverture_libre',
  'arche',
] as const;

export const ouverture = z.object({
  id: identifiant('o'),
  murId: identifiant('m'),
  /** Distance du début de l'ouverture depuis l'extrémité a du mur. */
  position: mmPositif,
  largeur: mmPositif.min(100).max(20_000),
  hauteur: mmPositif.min(100).max(10_000),
  allege: mmPositif.max(5_000),
  type: z.enum(TYPES_OUVERTURE),
  modeleId: z.string().min(1).max(64).optional(),
  sens: z.enum(['gauche', 'droite']).default('gauche'),
  cote: z.enum(['interieur', 'exterieur']).default('interieur'),
  volet: z.enum(['roulant', 'battant']).nullable().default(null),
  /** Menuiserie (lot 15h) : remplissage des vantaux, petits bois, matériau, couleur, imposte. */
  remplissage: z.enum(['plein', 'vitre', 'semi_vitre', 'cassettes']).optional(),
  petitsBois: z
    .object({
      colonnes: z.number().int().min(1).max(8),
      rangees: z.number().int().min(1).max(8),
    })
    .optional(),
  materiau: z.enum(['pvc', 'bois', 'alu']).optional(),
  couleur: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, 'Couleur invalide')
    .optional(),
  imposte: z.enum(['fixe', 'ouvrante']).optional(),
});

export const TYPES_PIECE = [
  'sejour',
  'cuisine',
  'chambre',
  'salle_de_bain',
  'salle_d_eau',
  'wc',
  'entree',
  'couloir',
  'bureau',
  'buanderie',
  'dressing',
  'cellier',
  'garage',
  'combles',
  'autre',
] as const;

export const piece = z.object({
  id: identifiant('p'),
  contour: polygone,
  nom: z.string().trim().min(1).max(60),
  type: z.enum(TYPES_PIECE).default('autre'),
  sol: revetement.default(REVETEMENT_VIDE),
  plafond: revetement.default(REVETEMENT_VIDE),
  hauteurSousPlafond: mmPositif.max(20_000).optional(),
  /** Zones sous 1,80 m, exclues de la surface Carrez. */
  zonesBasses: z.array(polygone).max(50).default([]),
});

export const objet = z.object({
  id: identifiant('obj'),
  catalogueId: z.string().min(1).max(64),
  position: point,
  rotation: angle.default(0),
  dimensions: z.object({ l: mmPositif.min(1), p: mmPositif.min(1), h: mmPositif }),
  variante: z.string().max(64).optional(),
  materiaux: z.record(z.string().max(32), z.string().max(64)).default({}),
  accrocheMurId: identifiant('m').optional(),
  altitude: mmPositif.default(0),
  /** Rotation libre (lot 15g) : bascule autour des axes x et y locaux, en dixièmes de degré. */
  inclinaison: z.object({ x: angle, y: angle }).optional(),
  /** Verrouillé (DES-29) : ni déplacé, ni modifié, ni supprimé. */
  verrouille: z.boolean().optional(),
});

export const escalier = z.object({
  id: identifiant('esc'),
  type: z.enum(['droit', 'quart_bas', 'quart_haut', 'deux_quarts', 'helicoidal', 'meunier']),
  position: point,
  rotation: angle.default(0),
  largeur: mmPositif.min(500).max(3_000),
  hauteurAMonter: mmPositif.min(100).max(10_000),
  nbMarches: z.number().int().min(2).max(40),
  giron: mmPositif.min(100).max(400),
  sens: z.enum(['gauche', 'droite']).default('droite'),
  gardeCorps: z.boolean().default(true),
});

export const cote = z.object({
  id: identifiant('c'),
  a: point,
  b: point,
  decalage: mm.default(0),
});

export const texte = z.object({
  id: identifiant('t'),
  position: point,
  contenu: z.string().trim().min(1).max(200),
  taille: z.number().int().min(8).max(72).default(14),
});

export const zoneDeco = z.object({
  id: identifiant('z'),
  support: z.discriminatedUnion('genre', [
    z.object({ genre: z.literal('mur'), murId: identifiant('m'), face: z.enum(['a', 'b']) }),
    z.object({
      genre: z.literal('piece'),
      pieceId: identifiant('p'),
      surface: z.enum(['sol', 'plafond']),
    }),
  ]),
  contour: polygone,
  revetement,
});

export const toiture = z.object({
  type: z.enum(['deux_pans', 'quatre_pans', 'croupe', 'monopente', 'plate', 'mansarde']),
  /** Pente de chaque pan, de 0 à 90°. */
  pentes: z.array(angle.min(0).max(900)).min(1).max(8),
  debord: mmPositif.max(2_000).default(400),
  faitageAngle: angle.default(0),
  couverture: revetement.default({ famille: 'tuile' }),
  lucarnes: z
    .array(
      z.object({
        id: identifiant('l'),
        type: z.enum(['jacobine', 'capucine', 'chien_assis']),
        pan: z.number().int().min(0).max(7),
        position: point,
        largeur: mmPositif.min(400).max(5_000),
      }),
    )
    .max(20)
    .default([]),
  fenetresToit: z
    .array(
      z.object({
        id: identifiant('ft'),
        pan: z.number().int().min(0).max(7),
        position: point,
        largeur: mmPositif.min(300).max(3_000),
        hauteur: mmPositif.min(300).max(3_000),
      }),
    )
    .max(30)
    .default([]),
  cheminees: z
    .array(
      z.object({
        id: identifiant('ch'),
        position: point,
        largeur: mmPositif.min(200),
        profondeur: mmPositif.min(200),
      }),
    )
    .max(5)
    .default([]),
});

export const terrasse = z.object({
  id: identifiant('te'),
  contour: polygone,
  revetement: revetement.default({ famille: 'bois' }),
  hauteur: mmPositif.max(5_000).default(0),
  gardeCorps: z.boolean().default(false),
  pergola: z.boolean().default(false),
});

export const piscine = z
  .object({
    id: identifiant('pi'),
    forme: z.enum(['rectangle', 'ronde', 'ovale', 'haricot', 'L', 'couloir', 'hors_sol']),
    position: point,
    rotation: angle.default(0),
    longueur: mmPositif.min(1_000).max(50_000),
    largeur: mmPositif.min(1_000).max(25_000),
    profondeurMin: mmPositif.min(300).max(5_000),
    profondeurMax: mmPositif.min(300).max(5_000),
    escalier: z.enum(['roman', 'droit', 'angle']).nullable().default(null),
    margelle: revetement.default({ famille: 'pierre' }),
    debordement: z.boolean().default(false),
  })
  .refine((p) => p.profondeurMax >= p.profondeurMin, {
    message: 'La profondeur maximale doit être supérieure ou égale à la minimale',
    path: ['profondeurMax'],
  });

export const cloture = z.object({
  id: identifiant('cl'),
  points: z.array(point).min(2).max(200),
  type: z.enum(['grillage', 'bois', 'muret', 'haie', 'portail']),
  hauteur: mmPositif.max(4_000),
});

export const vegetal = z.object({
  id: identifiant('v'),
  type: z.enum(['arbre', 'arbuste', 'haie']),
  position: point,
  diametre: mmPositif.min(100).max(30_000),
});

export const exterieur = z.object({
  terrasses: z.array(terrasse).max(50).default([]),
  piscines: z.array(piscine).max(5).default([]),
  allees: z.array(polygone).max(50).default([]),
  clotures: z.array(cloture).max(50).default([]),
  vegetation: z.array(vegetal).max(500).default([]),
});

export const niveau = z.object({
  id: identifiant('n'),
  nom: z.string().trim().min(1).max(40),
  type: z.enum(['sous_sol', 'rdc', 'etage', 'combles']),
  altitude: mm,
  hauteurSousPlafond: mmPositif.min(1_000).max(20_000).default(2_500),
  epaisseurPlancher: mmPositif.max(1_000).default(200),
  murs: z.array(mur).max(2_000).default([]),
  ouvertures: z.array(ouverture).max(1_000).default([]),
  pieces: z.array(piece).max(500).default([]),
  objets: z.array(objet).max(5_000).default([]),
  escaliers: z.array(escalier).max(20).default([]),
  tremies: z.array(polygone).max(20).default([]),
  cotes: z.array(cote).max(500).default([]),
  textes: z.array(texte).max(500).default([]),
  zonesDeco: z.array(zoneDeco).max(500).default([]),
  toiture: toiture.nullable().default(null),
  exterieur: exterieur.default({
    terrasses: [],
    piscines: [],
    allees: [],
    clotures: [],
    vegetation: [],
  }),
});

export const terrain = z.object({
  parcelle: polygone,
  referenceCadastrale: z.string().max(40).optional(),
  codeInsee: z
    .string()
    .regex(/^\d[0-9AB]\d{3}$/, 'Code INSEE invalide')
    .optional(),
  implantation: z.object({ x: mm, y: mm, rotation: angle }),
  /** Lambert-93 (mm) du point 0,0 du plan (DES-35), quand la parcelle vient du cadastre. */
  georef: z
    .object({
      x: z.number().int().min(0).max(2_000_000_000),
      y: z.number().int().min(5_000_000_000).max(8_000_000_000),
    })
    .optional(),
  /** Photo aérienne IGN enregistrée dans le dossier du plan, emprise en Lambert-93 (mm). */
  orthophoto: z
    .object({
      storagePath: z.string().min(1).max(300),
      emprise: z.object({
        x0: z.number().int(),
        y0: z.number().int(),
        x1: z.number().int(),
        y1: z.number().int(),
      }),
    })
    .optional(),
});

const CALQUES_DEFAUT = {
  cotes: true,
  surfaces: true,
  mobilier: true,
  electricite: true,
  plomberie: true,
  annotations: true,
  fondImage: true,
};

export const scene = z
  .object({
    version: z.literal(SCENE_VERSION),
    unites: z.object({ affichage: z.enum(['cm', 'm']) }).default({ affichage: 'm' }),
    orientationNord: angle.default(0),
    /** Plan verrouillé (DES-29) : consultable, plus modifiable avant déverrouillage. */
    verrouille: z.boolean().optional(),
    terrain: terrain.nullable().default(null),
    niveaux: z.array(niveau).min(1).max(10),
    calques: z
      .object({
        cotes: z.boolean(),
        surfaces: z.boolean(),
        mobilier: z.boolean(),
        electricite: z.boolean(),
        plomberie: z.boolean(),
        annotations: z.boolean(),
        fondImage: z.boolean(),
      })
      .default(CALQUES_DEFAUT),
    fondImage: z
      .object({
        storagePath: z.string().min(1).max(300),
        /** Millimètres réels pour 1 000 pixels de l'image. */
        mmPour1000Px: z.number().int().min(1).max(10_000_000),
        position: point,
        rotation: angle,
        opacite: z.number().int().min(0).max(100),
        niveauId: identifiant('n'),
      })
      .nullable()
      .default(null),
  })
  .superRefine((s, ctx) => {
    const vus = new Set<string>();
    s.niveaux.forEach((n, i) => {
      const elements = [
        n,
        ...n.murs,
        ...n.ouvertures,
        ...n.pieces,
        ...n.objets,
        ...n.escaliers,
        ...n.cotes,
        ...n.textes,
        ...n.zonesDeco,
      ];
      for (const { id } of elements) {
        if (vus.has(id))
          ctx.addIssue({
            code: 'custom',
            message: `Identifiant en double : ${id}`,
            path: ['niveaux', i],
          });
        vus.add(id);
      }
      const murs = new Set(n.murs.map((m) => m.id));
      n.ouvertures.forEach((o, j) => {
        if (!murs.has(o.murId))
          ctx.addIssue({
            code: 'custom',
            message: 'Ouverture rattachée à un mur absent',
            path: ['niveaux', i, 'ouvertures', j, 'murId'],
          });
      });
    });
  });

export type Point = z.infer<typeof point>;
export type Revetement = z.infer<typeof revetement>;
export type FamilleRevetement = (typeof FAMILLES_REVETEMENT)[number];
export type Pose = (typeof POSES)[number];
export type Objet = z.infer<typeof objet>;
export type ZoneDeco = z.infer<typeof zoneDeco>;
export type Mur = z.infer<typeof mur>;
export type TypeMur = (typeof TYPES_MUR)[number];
export type Ouverture = z.infer<typeof ouverture>;
export type CoteLibre = z.infer<typeof cote>;
export type TexteLibre = z.infer<typeof texte>;
export type Piece = z.infer<typeof piece>;
export type Niveau = z.infer<typeof niveau>;
export type Scene = z.infer<typeof scene>;
