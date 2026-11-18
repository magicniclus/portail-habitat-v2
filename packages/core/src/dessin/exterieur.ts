import { echec, succes, type Resultat } from '../resultat';
import {
  cloture as schemaCloture,
  piscine as schemaPiscine,
  terrasse as schemaTerrasse,
  vegetal as schemaVegetal,
  type Niveau,
  type Point,
  type Scene,
} from '../schemas/dessinScene';
import type { Contexte } from './commandes';
import { contourPiscine } from './formePiscine';
import {
  clotureTraverse,
  piscineSurLaMaison,
  placerTerrasse,
  placerVegetal,
  rectanglePlage,
} from './placementExterieur';
import { aire, distance, projeter } from './geometrie';

export { contourPiscine };

/**
 * Extérieur (DES-18 à DES-20) : terrasses (surélevées avec marches), allées, clôtures,
 * végétation, parcelle, piscines (formes, volume d'eau, distance aux limites indicative).
 */
export type Terrasse = Niveau['exterieur']['terrasses'][number];
export type Piscine = Niveau['exterieur']['piscines'][number];
export type Cloture = Niveau['exterieur']['clotures'][number];
export type Vegetal = Niveau['exterieur']['vegetation'][number];
export type TypeCloture = Cloture['type'];
export type FormePiscine = Piscine['forme'];
export type GenreExterieur = 'terrasse' | 'piscine' | 'cloture' | 'vegetal' | 'allee';

export const LIBELLES_FORME_PISCINE: Record<FormePiscine, string> = {
  rectangle: 'Rectangulaire',
  ronde: 'Ronde',
  ovale: 'Ovale',
  haricot: 'Haricot',
  L: 'En L',
  couloir: 'Couloir de nage',
  hors_sol: 'Hors-sol',
};
/** Dimensions de départ d'une piscine selon sa forme (mm). */
const PISCINE_DEFAUT: Record<FormePiscine, { longueur: number; largeur: number }> = {
  rectangle: { longueur: 8_000, largeur: 4_000 },
  ronde: { longueur: 4_000, largeur: 4_000 },
  ovale: { longueur: 7_000, largeur: 3_500 },
  haricot: { longueur: 7_000, largeur: 3_500 },
  L: { longueur: 8_000, largeur: 5_000 },
  couloir: { longueur: 15_000, largeur: 2_500 },
  hors_sol: { longueur: 5_000, largeur: 3_000 },
};
/** Diamètre adulte par défaut d'un végétal (mm) ; hauteur d'une clôture (mm). */
export const DIAMETRE_VEGETAL: Record<Vegetal['type'], number> = {
  arbre: 6_000,
  arbuste: 1_500,
  haie: 800,
};
/** Espace laissé entre la ramure et la façade (mm) : un arbre ne touche pas la maison. */
export const DEGAGEMENT_VEGETAL: Record<Vegetal['type'], number> = {
  arbre: 1_500,
  arbuste: 300,
  haie: 0,
};
export const HAUTEUR_CLOTURE: Record<Cloture['type'], number> = {
  grillage: 1_500,
  bois: 1_800,
  muret: 800,
  haie: 1_600,
  portail: 1_600,
};
/** Hauteur d'une marche de terrasse (mm) et largeur de l'escalier. */
const MARCHE = { hauteur: 170, giron: 300, largeur: 1_200 };

/** Volume d'eau (litres) : surface du bassin × profondeur moyenne (fond en pente). */
export const volumeEau = (p: Omit<Piscine, 'id'>) =>
  Math.round((aire(contourPiscine(p)) * (p.profondeurMin + p.profondeurMax)) / 2 / 1_000_000);

/** Plus petite distance (mm) d'un contour aux limites de la parcelle (indicatif). */
export function distanceAuxLimites(contour: readonly Point[], parcelle: readonly Point[]): number {
  let d = Infinity;
  for (const p of contour)
    parcelle.forEach((a, i) => {
      d = Math.min(d, distance(p, projeter(p, a, parcelle[(i + 1) % parcelle.length]!).point));
    });
  return Math.round(d);
}

/**
 * Marches d'une terrasse surélevée : au milieu du côté le plus éloigné de la maison (`maison` :
 * son centre), vers l'extérieur. `cote` : rang de ce côté (le garde-corps s'y interrompt).
 */
export function marchesTerrasse(
  t: Terrasse,
  maison?: Point,
): {
  centre: Point;
  angle: number;
  hauteur: number;
  giron: number;
  largeur: number;
  nombre: number;
  cote: number;
} | null {
  if (t.hauteur < MARCHE.hauteur) return null;
  const nombre = Math.ceil(t.hauteur / MARCHE.hauteur);
  const milieux = t.contour.map((p, i) => {
    const q = t.contour[(i + 1) % t.contour.length]!;
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  });
  const cote = maison
    ? milieux.reduce((m, p, i) => (distance(p, maison) > distance(milieux[m]!, maison) ? i : m), 0)
    : 0;
  const [a, b] = [t.contour[cote]!, t.contour[(cote + 1) % t.contour.length]!];
  return {
    centre: milieux[cote]!,
    angle: Math.atan2(b.y - a.y, b.x - a.x),
    hauteur: t.hauteur / nombre,
    giron: MARCHE.giron,
    largeur: Math.min(MARCHE.largeur, distance(a, b)),
    nombre: nombre - 1,
    cote,
  };
}

const rectangle = (a: Point, b: Point): Point[] => [
  { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
  { x: Math.max(a.x, b.x), y: Math.min(a.y, b.y) },
  { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
  { x: Math.min(a.x, b.x), y: Math.max(a.y, b.y) },
];
const tropPetit = (a: Point, b: Point) => Math.abs(a.x - b.x) < 300 || Math.abs(a.y - b.y) < 300;
const avec = (n: Niveau, e: Partial<Niveau['exterieur']>): Niveau => ({
  ...n,
  exterieur: { ...n.exterieur, ...e },
});

export function ajouterTerrasse(
  n: Niveau,
  a: Point,
  b: Point,
  ctx: Contexte,
  options: { aimant?: boolean } = {},
): Resultat<Niveau & { elementId: string }> {
  if (tropPetit(a, b))
    return echec('PRECONDITION', {
      message: 'Terrasse trop petite (30 cm au moins de chaque côté).',
    });
  const place = placerTerrasse(n, a, b, options.aimant ?? true);
  if (typeof place === 'string') return echec('PRECONDITION', { message: place });
  const t = schemaTerrasse.parse({ id: ctx.nouvelId('te'), contour: rectangle(...place) });
  return succes({ ...avec(n, { terrasses: [...n.exterieur.terrasses, t] }), elementId: t.id });
}

export function ajouterAllee(n: Niveau, a: Point, b: Point): Resultat<Niveau> {
  if (tropPetit(a, b))
    return echec('PRECONDITION', { message: 'Allée trop étroite (30 cm au moins).' });
  if (n.exterieur.allees.length >= 50)
    return echec('PRECONDITION', { message: '50 allées au plus.' });
  return succes(avec(n, { allees: [...n.exterieur.allees, rectangle(a, b)] }));
}

export function ajouterPiscine(
  n: Niveau,
  position: Point,
  forme: FormePiscine,
  ctx: Contexte,
): Resultat<Niveau & { elementId: string }> {
  if (n.exterieur.piscines.length >= 5)
    return echec('PRECONDITION', { message: '5 piscines au plus.' });
  const p = schemaPiscine.parse({
    id: ctx.nouvelId('pi'),
    forme,
    position: { x: Math.round(position.x), y: Math.round(position.y) },
    ...PISCINE_DEFAUT[forme],
    profondeurMin: forme === 'hors_sol' ? 1_200 : 1_100,
    profondeurMax: forme === 'hors_sol' ? 1_200 : 1_800,
    escalier: forme === 'hors_sol' || forme === 'ronde' ? null : 'roman',
  });
  if (piscineSurLaMaison(n, contourPiscine(p)))
    return echec('PRECONDITION', { message: 'La piscine empiéterait sur la maison.' });
  return succes({ ...avec(n, { piscines: [...n.exterieur.piscines, p] }), elementId: p.id });
}

/** Clôture : nouveau tronçon, ou point ajouté au tracé en cours (`id`). */
export function tracerCloture(
  n: Niveau,
  e: { id?: string; a: Point; b: Point; type: Cloture['type'] },
  ctx: Contexte,
): Resultat<Niveau & { elementId: string }> {
  if (distance(e.a, e.b) < 100) return echec('PRECONDITION', { message: 'Tronçon trop court.' });
  const traverse = clotureTraverse(n, e.a, e.b);
  if (traverse) return echec('PRECONDITION', { message: traverse });
  const existante = e.id ? n.exterieur.clotures.find((c) => c.id === e.id) : undefined;
  const c = existante
    ? schemaCloture.safeParse({ ...existante, points: [...existante.points, e.b] })
    : schemaCloture.safeParse({
        id: ctx.nouvelId('cl'),
        points: [e.a, e.b],
        type: e.type,
        hauteur: HAUTEUR_CLOTURE[e.type],
      });
  if (!c.success)
    return echec('PRECONDITION', { message: 'Clôture trop longue (200 points au plus).' });
  const clotures = existante
    ? n.exterieur.clotures.map((x) => (x.id === c.data.id ? c.data : x))
    : [...n.exterieur.clotures, c.data];
  return succes({ ...avec(n, { clotures }), elementId: c.data.id });
}

export function ajouterVegetal(
  n: Niveau,
  position: Point,
  type: Vegetal['type'],
  ctx: Contexte,
  options: { aimant?: boolean } = {},
): Resultat<Niveau & { elementId: string }> {
  const place = placerVegetal(
    n,
    position,
    DIAMETRE_VEGETAL[type],
    options.aimant ?? true,
    DEGAGEMENT_VEGETAL[type],
  );
  if (typeof place === 'string') return echec('PRECONDITION', { message: place });
  const v = schemaVegetal.safeParse({
    id: ctx.nouvelId('v'),
    type,
    position: place,
    diametre: DIAMETRE_VEGETAL[type],
  });
  if (!v.success || n.exterieur.vegetation.length >= 500)
    return echec('PRECONDITION', { message: '500 végétaux au plus.' });
  return succes({
    ...avec(n, { vegetation: [...n.exterieur.vegetation, v.data] }),
    elementId: v.data.id,
  });
}

const LISTES = {
  terrasse: 'terrasses',
  piscine: 'piscines',
  cloture: 'clotures',
  vegetal: 'vegetation',
} as const;
const SCHEMAS = {
  terrasse: schemaTerrasse,
  piscine: schemaPiscine,
  cloture: schemaCloture,
  vegetal: schemaVegetal,
};

/** Modifie un élément extérieur (réglages de l'inspecteur), validé par son schéma. */
export function modifierExterieur(
  n: Niveau,
  genre: Exclude<GenreExterieur, 'allee'>,
  id: string,
  modif: Record<string, unknown>,
): Resultat<Niveau> {
  const liste = n.exterieur[LISTES[genre]] as { id: string }[];
  const x = liste.find((e) => e.id === id);
  if (!x) return echec('INTROUVABLE');
  const r = SCHEMAS[genre].safeParse({ ...x, ...modif });
  if (!r.success) return echec('ENTREE_INVALIDE', { message: r.error.issues[0]!.message });
  if (genre === 'piscine' && piscineSurLaMaison(n, contourPiscine(r.data as Piscine)))
    return echec('PRECONDITION', { message: 'La piscine empiéterait sur la maison.' });
  return succes(avec(n, { [LISTES[genre]]: liste.map((e) => (e.id === id ? r.data : e)) }));
}

/** Retire un élément extérieur ; une allée se désigne par son rang (« 0 », « 1 »…). */
export function supprimerExterieur(n: Niveau, genre: GenreExterieur, id: string): Resultat<Niveau> {
  if (genre === 'allee') {
    const i = Number(id);
    if (!Number.isInteger(i) || !n.exterieur.allees[i]) return echec('INTROUVABLE');
    return succes(avec(n, { allees: n.exterieur.allees.filter((_, j) => j !== i) }));
  }
  const liste = n.exterieur[LISTES[genre]] as { id: string }[];
  if (!liste.some((e) => e.id === id)) return echec('INTROUVABLE');
  return succes(avec(n, { [LISTES[genre]]: liste.filter((e) => e.id !== id) }));
}

/** Parcelle (DES-19) : rectangle tracé, ou autour de la maison avec une marge. */
export function definirParcelle(s: Scene, a: Point, b: Point): Resultat<Scene> {
  if (tropPetit(a, b)) return echec('PRECONDITION', { message: 'Parcelle trop petite.' });
  return succes({
    ...s,
    terrain: {
      ...(s.terrain ?? { implantation: { x: 0, y: 0, rotation: 0 } }),
      parcelle: rectangle(a, b),
    },
  });
}
export function parcelleAutour(s: Scene, marge = 8_000): Resultat<Scene> {
  const pts = s.niveaux.flatMap((n) => n.murs.flatMap((m) => [m.a, m.b]));
  if (!pts.length) return echec('PRECONDITION', { message: 'Dessinez d’abord la maison.' });
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return definirParcelle(
    s,
    { x: Math.min(...xs) - marge, y: Math.min(...ys) - marge },
    { x: Math.max(...xs) + marge, y: Math.max(...ys) + marge },
  );
}

/** Terrasse autour de la piscine, jusqu'à la maison (DES-18, DES-20) : la piscine y est encastrée. */
export function terrasseAutourDePiscine(
  n: Niveau,
  piscineId: string,
  ctx: Contexte,
): Resultat<Niveau & { elementId: string }> {
  const p = n.exterieur.piscines.find((x) => x.id === piscineId);
  if (!p) return echec('INTROUVABLE');
  const [a, b] = rectanglePlage(n, contourPiscine(p));
  return ajouterTerrasse(n, a, b, ctx, { aimant: false });
}
