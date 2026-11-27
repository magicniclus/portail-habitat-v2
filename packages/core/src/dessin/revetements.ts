import { echec, succes, type Resultat } from '../resultat';
import {
  zoneDeco as schemaZone,
  type FINITIONS_PEINTURE,
  type FamilleRevetement,
  type Niveau,
  type Point,
  type Pose,
  type Revetement,
} from '../schemas/dessinScene';
import type { CibleRevetement, Contexte } from './commandes';
import { pointDansPolygone } from './geometrie';
import { longueurMur } from './murs';

/** Revêtements (DES-25 à DES-28) : familles par support, toute la pièce, pipette, zones. */

export const FAMILLES_SOL: readonly FamilleRevetement[] = [
  'parquet',
  'stratifie',
  'vinyle',
  'moquette',
  'carrelage',
  'beton_cire',
  'pierre',
];
export const FAMILLES_MUR: readonly FamilleRevetement[] = [
  'peinture',
  'papier_peint',
  'faience',
  'parement',
  'enduit',
  'bardage',
];

export const LIBELLES_FAMILLE: Partial<Record<FamilleRevetement, string>> = {
  peinture: 'Peinture',
  papier_peint: 'Papier peint',
  faience: 'Faïence',
  parement: 'Parement',
  enduit: 'Enduit',
  bardage: 'Bardage',
  parquet: 'Parquet',
  stratifie: 'Stratifié',
  vinyle: 'Sol vinyle',
  moquette: 'Moquette',
  carrelage: 'Carrelage',
  beton_cire: 'Béton ciré',
  pierre: 'Pierre',
  gazon: 'Gazon',
  gravier: 'Gravier',
  dalle: 'Dalles et pavés',
  bois: 'Bois (lames)',
};

export const LIBELLES_POSE: Record<Pose, string> = {
  droite: 'Droite',
  decalee: 'Décalée',
  diagonale: 'Diagonale',
  chevron: 'Chevrons',
  point_de_hongrie: 'Point de Hongrie',
  baton_rompu: 'Bâton rompu',
};

/** Familles posées en éléments (carreaux, lames) : pose et joint réglables. */
export type FinitionPeinture = (typeof FINITIONS_PEINTURE)[number];
export const LIBELLES_FINITION: Record<FinitionPeinture, string> = {
  mat: 'Mat',
  satin: 'Satin',
  brillant: 'Brillant',
};

/**
 * Peinture choisie librement (DES-25) : couleur hexadécimale à six chiffres et finition. Repart de la peinture
 * déjà posée (sa couleur ou sa finition est gardée si l'autre seule change) ; `null` si la
 * couleur est illisible.
 */
export function peinture(
  actuel: Revetement | null,
  modif: { couleur?: string; finition?: FinitionPeinture },
  /** Couleur de départ quand rien n'est peint (fournie par les jetons de l'interface). */
  blanc: string,
): Revetement | null {
  const avant = actuel?.famille === 'peinture' ? actuel : null;
  const couleur = (modif.couleur ?? avant?.couleur ?? blanc).toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(couleur)) return null;
  const finition = modif.finition ?? avant?.finition ?? 'mat';
  // Couleur saisie : ce n'est plus un matériau du catalogue.
  const materiauId = modif.couleur === undefined ? avant?.materiauId : undefined;
  return { famille: 'peinture', couleur, finition, ...(materiauId ? { materiauId } : {}) };
}

export const FAMILLES_A_POSE: readonly FamilleRevetement[] = [
  'parquet',
  'stratifie',
  'vinyle',
  'carrelage',
  'faience',
  'pierre',
  'parement',
  'dalle',
  'bois',
];

/** Point juste devant une face de mur (a : à gauche en allant de a vers b). */
export function devant(m: Niveau['murs'][number], face: 'a' | 'b'): Point {
  const l = longueurMur(m);
  const s = face === 'a' ? 1 : -1;
  const d = m.epaisseur / 2 + 50;
  return {
    x: (m.a.x + m.b.x) / 2 + (-(m.b.y - m.a.y) / l) * d * s,
    y: (m.a.y + m.b.y) / 2 + ((m.b.x - m.a.x) / l) * d * s,
  };
}

/** Faces de murs tournées vers une pièce. */
export function facesDeLaPiece(n: Niveau, pieceId: string): { murId: string; face: 'a' | 'b' }[] {
  const piece = n.pieces.find((p) => p.id === pieceId);
  if (!piece) return [];
  return n.murs.flatMap((m) =>
    (['a', 'b'] as const)
      .filter(
        (face) => m.type !== 'separation' && pointDansPolygone(devant(m, face), piece.contour),
      )
      .map((face) => ({ murId: m.id, face })),
  );
}

/** Tous les murs d'une pièce, en une fois (DES-28). */
export function revetirMursDeLaPiece(n: Niveau, pieceId: string, r: Revetement): Resultat<Niveau> {
  const faces = facesDeLaPiece(n, pieceId);
  if (faces.length === 0)
    return echec('INTROUVABLE', { message: 'Aucun mur autour de cette pièce.' });
  const cle = (f: 'a' | 'b') => (f === 'a' ? 'faceA' : 'faceB');
  return succes({
    ...n,
    murs: n.murs.map((m) =>
      faces.filter((f) => f.murId === m.id).reduce((acc, f) => ({ ...acc, [cle(f.face)]: r }), m),
    ),
  });
}

/** Pipette (DES-28) : le revêtement d'un sol, d'un plafond ou d'une face de mur. */
export function revetementDe(n: Niveau, cible: CibleRevetement): Revetement | null {
  if (cible.genre === 'mur') {
    const m = n.murs.find((x) => x.id === cible.murId);
    return m ? (cible.face === 'a' ? m.faceA : m.faceB) : null;
  }
  const p = n.pieces.find((x) => x.id === cible.pieceId);
  return p ? p[cible.surface] : null;
}

/** Zone décorative au sol (tapis de carrelage, DES-27) : un polygone dans une pièce. */
/**
 * Second coin d'une zone au sol tracée depuis `a` : ramené dans la pièce de départ (son
 * rectangle englobant), pour que la zone reste dedans pendant le tracé ; `p` si `a` n'est dans
 * aucune pièce.
 */
export function coinZone(n: Pick<Niveau, 'pieces'>, a: Point, p: Point): Point {
  const piece = n.pieces.find((x) => pointDansPolygone(a, x.contour));
  if (!piece) return p;
  const xs = piece.contour.map((q) => q.x);
  const ys = piece.contour.map((q) => q.y);
  const borne = (v: number, min: number, max: number) => Math.min(max - 1, Math.max(min + 1, v));
  return {
    x: Math.round(borne(p.x, Math.min(...xs), Math.max(...xs))),
    y: Math.round(borne(p.y, Math.min(...ys), Math.max(...ys))),
  };
}

export function ajouterZoneSol(
  n: Niveau,
  e: { pieceId: string; contour: Point[]; revetement: Revetement },
  ctx: Contexte,
): Resultat<Niveau & { zoneId: string }> {
  const piece = n.pieces.find((p) => p.id === e.pieceId);
  if (!piece) return echec('INTROUVABLE');
  if (!e.contour.every((p) => pointDansPolygone(p, piece.contour)))
    return echec('PRECONDITION', { message: 'La zone doit rester dans la pièce.' });
  const r = schemaZone.safeParse({
    id: ctx.nouvelId('z'),
    support: { genre: 'piece', pieceId: e.pieceId, surface: 'sol' },
    contour: e.contour,
    revetement: e.revetement,
  });
  if (!r.success) return echec('ENTREE_INVALIDE', { message: r.error.issues[0]!.message });
  return succes({ ...n, zonesDeco: [...n.zonesDeco, r.data], zoneId: r.data.id });
}

export function revetirZone(n: Niveau, id: string, r: Revetement): Resultat<Niveau> {
  if (!n.zonesDeco.some((z) => z.id === id)) return echec('INTROUVABLE');
  return succes({
    ...n,
    zonesDeco: n.zonesDeco.map((z) => (z.id === id ? { ...z, revetement: r } : z)),
  });
}

export function supprimerZone(n: Niveau, id: string): Resultat<Niveau> {
  if (!n.zonesDeco.some((z) => z.id === id)) return echec('INTROUVABLE');
  return succes({ ...n, zonesDeco: n.zonesDeco.filter((z) => z.id !== id) });
}
