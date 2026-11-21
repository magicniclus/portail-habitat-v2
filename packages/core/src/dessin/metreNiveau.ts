import type { Mur, Niveau, Ouverture, Piece, Point } from '../schemas/dessinScene';
import { objetDuCatalogue } from './catalogue';
import { quantitesToiture } from './commandesToit';
import { planDeTravail } from './cuisine';
import { contourPiscine } from './formePiscine';
import { aire, perimetre, pointDansPolygone } from './geometrie';
import {
  PRESTATION_FIXE,
  PRESTATION_MUR,
  PRESTATION_SOL,
  type LigneMetre,
  type PosteMetre,
  type UniteMetre,
} from './metre';
import { longueurMur, surfaceFaceNette } from './murs';

/** Calcul du métré d'un niveau (DES-43) : postes et libellés dans metre.ts. */

const PORTES_INTERIEURES: readonly Ouverture['type'][] = [
  'porte',
  'porte_double',
  'porte_coulissante',
  'porte_galandage',
  'porte_galandage_double',
  'porte_pivot',
  'ouverture_libre',
  'arche',
];
const FENETRES: readonly Ouverture['type'][] = [
  'fenetre',
  'fenetre_double',
  'fenetre_oscillo',
  'fenetre_fixe',
  'oeil_de_boeuf',
  'porte_fenetre',
  'baie_coulissante',
];
const MURS_REVETUS: readonly Mur['type'][] = ['mur', 'cloison', 'demi_mur'];

const perimetreOuvert = (pts: readonly Point[]) =>
  pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y), 0);

/** Point situé juste devant une face du mur (a : à gauche en allant de a vers b). */
function devantLaFace(m: Mur, face: 'a' | 'b'): Point {
  const l = longueurMur(m);
  const s = face === 'a' ? 1 : -1;
  const d = m.epaisseur / 2 + 50;
  return {
    x: (m.a.x + m.b.x) / 2 + (-(m.b.y - m.a.y) / l) * d * s,
    y: (m.a.y + m.b.y) / 2 + ((m.b.x - m.a.x) / l) * d * s,
  };
}

const faceDansUnePiece = (m: Mur, face: 'a' | 'b', pieces: readonly Piece[]) =>
  pieces.some((p) => pointDansPolygone(devantLaFace(m, face), p.contour));

type Ajouter = (l: LigneMetre) => void;
type Fixe = (poste: PosteMetre, quantite: number, unite: UniteMetre) => void;

/** Sols, plafonds, faces de murs revêtues et plinthes (moins les seuils de portes). */
function metreSurfaces(n: Niveau, ajouter: Ajouter) {
  for (const p of n.pieces) {
    const s = Math.round(aire(p.contour));
    ajouter({
      poste: 'sol',
      famille: p.sol.famille,
      quantite: s,
      unite: 'm2',
      prestationId: PRESTATION_SOL[p.sol.famille] ?? null,
    });
    ajouter({
      poste: 'plafond',
      famille: p.plafond.famille,
      quantite: s,
      unite: 'm2',
      prestationId: null,
    });
  }
  let plinthes = n.pieces.reduce((s, p) => s + perimetre(p.contour), 0);
  for (const m of n.murs.filter((x) => MURS_REVETUS.includes(x.type))) {
    for (const face of ['a', 'b'] as const) {
      if (!faceDansUnePiece(m, face, n.pieces)) continue;
      const rev = face === 'a' ? m.faceA : m.faceB;
      ajouter({
        poste: 'murs',
        famille: rev.famille,
        quantite: surfaceFaceNette(m, n.ouvertures),
        unite: 'm2',
        prestationId: PRESTATION_MUR[rev.famille] ?? null,
      });
      for (const o of n.ouvertures) if (o.murId === m.id && o.allege === 0) plinthes -= o.largeur;
    }
  }
  ajouter({ poste: 'plinthes', quantite: Math.round(plinthes), unite: 'ml', prestationId: null });
}

/** Cloisons et menuiseries comptées. */
function metreOuvrages(n: Niveau, fixe: Fixe) {
  const cloisons = n.murs
    .filter((m) => m.type === 'cloison')
    .reduce((s, m) => s + longueurMur(m), 0);
  fixe('cloisons', Math.round(cloisons), 'ml');
  const compter = (types: readonly Ouverture['type'][]) =>
    n.ouvertures.filter((o) => types.includes(o.type)).length;
  fixe('portes_interieures', compter(PORTES_INTERIEURES), 'u');
  fixe('porte_entree', compter(['porte_entree']), 'u');
  fixe('porte_garage', compter(['porte_garage']), 'u');
  fixe('fenetres', compter(FENETRES), 'u');
}

/** Extérieur : terrasses (sans les piscines encastrées), piscines, clôtures, allées ; escaliers. */
function metreExterieur(n: Niveau, fixe: Fixe) {
  const e = n.exterieur;
  const encastrees = e.piscines.filter((p) =>
    e.terrasses.some((t) => contourPiscine(p).every((q) => pointDansPolygone(q, t.contour))),
  );
  fixe(
    'terrasse',
    Math.round(
      e.terrasses.reduce((s, t) => s + aire(t.contour), 0) -
        encastrees.reduce((s, p) => s + aire(contourPiscine(p)), 0),
    ),
    'm2',
  );
  fixe('piscine', e.piscines.length, 'u');
  fixe('clotures', Math.round(e.clotures.reduce((s, c) => s + perimetreOuvert(c.points), 0)), 'ml');
  fixe('allees', Math.round(e.allees.reduce((s, a) => s + aire(a), 0)), 'm2');
  fixe('escalier', n.escaliers.length, 'u');
}

/** Cuisine et équipements posés (DES-23, DES-43) : rattachés à leur prestation. */
function metreEquipements(n: Niveau, ajouter: Ajouter) {
  ajouter({
    poste: 'plan_de_travail',
    quantite: planDeTravail(n).longueur,
    unite: 'ml',
    prestationId: 'cuisine-plan',
  });
  for (const o of n.objets) {
    const prestationId = objetDuCatalogue(o.catalogueId)?.prestationId;
    if (prestationId) ajouter({ poste: 'equipements', quantite: 1, unite: 'u', prestationId });
  }
}

/** Toiture (DES-17) : un toit plat se chiffre en étanchéité. */
function metreToiture(n: Niveau, dessus: Niveau | null, ajouter: Ajouter, fixe: Fixe) {
  const q = quantitesToiture(n, dessus);
  if (!q) return;
  ajouter({
    poste: 'couverture',
    quantite: q.couverture,
    unite: 'm2',
    prestationId: n.toiture?.type === 'plate' ? 'etancheite' : null,
  });
  fixe('gouttieres', q.gouttieres, 'ml');
  fixe('fenetres_toit', q.fenetresToit, 'u');
  fixe('cheminees', q.cheminees, 'u');
  fixe('lucarnes', q.lucarnes, 'u');
  if (q.carrez !== null) fixe('combles', q.carrez, 'm2');
}

/** `dessus` : niveau au-dessus, pour ne compter que la toiture des parties sans étage. */
export function metreNiveau(n: Niveau, dessus: Niveau | null = null): LigneMetre[] {
  const lignes: LigneMetre[] = [];
  const ajouter: Ajouter = (l) => {
    if (l.quantite <= 0) return;
    const meme = lignes.find(
      (x) => x.poste === l.poste && x.famille === l.famille && x.prestationId === l.prestationId,
    );
    if (meme) meme.quantite += l.quantite;
    else lignes.push({ ...l });
  };
  const fixe: Fixe = (poste, quantite, unite) =>
    ajouter({ poste, quantite, unite, prestationId: PRESTATION_FIXE[poste] ?? null });
  metreSurfaces(n, ajouter);
  metreOuvrages(n, fixe);
  metreExterieur(n, fixe);
  metreEquipements(n, ajouter);
  metreToiture(n, dessus, ajouter, fixe);
  return lignes;
}
