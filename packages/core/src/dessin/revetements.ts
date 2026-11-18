import { echec, succes, type Resultat } from '../resultat';
import {
  zoneDeco as schemaZone,
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
export const FAMILLES_A_POSE: readonly FamilleRevetement[] = [
  'parquet',
  'stratifie',
  'vinyle',
  'carrelage',
  'faience',
  'pierre',
  'parement',
];

/** Point juste devant une face de mur (a : à gauche en allant de a vers b). */
function devant(m: Niveau['murs'][number], face: 'a' | 'b'): Point {
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
