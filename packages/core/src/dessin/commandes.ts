import { echec, succes, type Resultat } from '../resultat';
import {
  mur as schemaMur,
  type Mur,
  type Niveau,
  type Point,
  type Revetement,
  type TypeMur,
} from '../schemas/dessinScene';
import { arrondir, distance } from './geometrie';
import {
  EPAISSEUR_DEFAUT,
  extremitesEn,
  HAUTEUR_FIXE,
  longueurMur,
  ouvertureTientDansLeMur,
} from './murs';
import { detecterPieces, synchroniserPieces } from './pieces';

/**
 * Commandes de l'éditeur (DES-06 à DES-12, DES-25) : fonctions pures Niveau → Niveau.
 * Chaque commande qui touche aux murs recalcule les pièces. L'historique (historique.ts)
 * conserve les niveaux successifs : annuler = revenir à l'instantané précédent.
 */
export interface Contexte {
  nouvelId: (prefixe: string) => string;
  /** Tolérance de jonction des extrémités, en mm. */
  tolerance?: number;
}

/** Pièces redétectées après un changement de murs (noms et revêtements gardés). */
export const avecPieces = (n: Niveau, ctx: Contexte): Niveau => ({
  ...n,
  pieces: synchroniserPieces(n.pieces, detecterPieces(n.murs), () => ctx.nouvelId('p')),
});

const trouverMur = (n: Niveau, id: string) => n.murs.find((m) => m.id === id);

const verifierOuvertures = (n: Niveau): Resultat<Niveau> => {
  for (const o of n.ouvertures) {
    const m = trouverMur(n, o.murId);
    if (m && !ouvertureTientDansLeMur(o, m))
      return echec('PRECONDITION', {
        message: 'Une porte ou une fenêtre ne tiendrait plus dans le mur. Déplacez-la d’abord.',
      });
  }
  return succes(n);
};

export function ajouterMur(
  n: Niveau,
  entree: { a: Point; b: Point; type: TypeMur; epaisseur?: number; hauteur?: number },
  ctx: Contexte,
): Resultat<Niveau> {
  const brut = {
    id: ctx.nouvelId('m'),
    a: arrondir(entree.a),
    b: arrondir(entree.b),
    type: entree.type,
    epaisseur: entree.epaisseur ?? EPAISSEUR_DEFAUT[entree.type],
    hauteur: entree.hauteur ?? HAUTEUR_FIXE[entree.type] ?? n.hauteurSousPlafond,
  };
  const r = schemaMur.safeParse(brut);
  if (!r.success) return echec('ENTREE_INVALIDE', { message: r.error.issues[0]!.message });
  return succes(avecPieces({ ...n, murs: [...n.murs, r.data] }, ctx));
}

/** Déplace une extrémité ; les murs qui y étaient joints suivent (DES-09). */
export function deplacerExtremite(
  n: Niveau,
  murId: string,
  extremite: 'a' | 'b',
  vers: Point,
  ctx: Contexte,
): Resultat<Niveau> {
  const m = trouverMur(n, murId);
  if (!m) return echec('INTROUVABLE');
  return deplacerPoints(n, [m[extremite]], () => arrondir(vers), ctx);
}

/** Déplace un mur parallèlement à lui-même ; les murs joints s'allongent ou raccourcissent. */
export function deplacerMur(
  n: Niveau,
  murId: string,
  delta: Point,
  ctx: Contexte,
): Resultat<Niveau> {
  const m = trouverMur(n, murId);
  if (!m) return echec('INTROUVABLE');
  return deplacerPoints(
    n,
    [m.a, m.b],
    (p) => arrondir({ x: p.x + delta.x, y: p.y + delta.y }),
    ctx,
  );
}

/**
 * Nouvelle longueur saisie sur une cote (DES-10) : l'extrémité `fixe` ne bouge pas,
 * l'autre glisse le long du mur.
 */
export function modifierLongueurMur(
  n: Niveau,
  murId: string,
  longueur: number,
  ctx: Contexte,
  fixe: 'a' | 'b' = 'a',
): Resultat<Niveau> {
  const m = trouverMur(n, murId);
  if (!m) return echec('INTROUVABLE');
  if (!Number.isInteger(longueur) || longueur <= 0)
    return echec('ENTREE_INVALIDE', { message: 'La longueur doit être positive.' });
  const [o, bout] = fixe === 'a' ? [m.a, m.b] : [m.b, m.a];
  const l = longueurMur(m);
  const vers = {
    x: o.x + ((bout.x - o.x) / l) * longueur,
    y: o.y + ((bout.y - o.y) / l) * longueur,
  };
  // Un seul mur joint à l'extrémité qui bouge, non aligné : il se déplace parallèlement
  // (la pièce reste d'équerre), comme quand on tire sur une cote. Sinon, l'extrémité seule.
  const joints = extremitesEn(n.murs, bout, ctx.tolerance ?? 1).filter((j) => j.murId !== murId);
  const voisin = joints.length === 1 ? trouverMur(n, joints[0]!.murId) : undefined;
  if (voisin && !alignes(m, voisin))
    return deplacerMur(n, voisin.id, { x: vers.x - bout.x, y: vers.y - bout.y }, ctx);
  return deplacerExtremite(n, murId, fixe === 'a' ? 'b' : 'a', vers, ctx);
}

/** Deux murs de même direction (au sens près). */
function alignes(m1: Mur, m2: Mur): boolean {
  const v1 = { x: m1.b.x - m1.a.x, y: m1.b.y - m1.a.y };
  const v2 = { x: m2.b.x - m2.a.x, y: m2.b.y - m2.a.y };
  return Math.abs(v1.x * v2.y - v1.y * v2.x) / (longueurMur(m1) * longueurMur(m2)) < 1e-3;
}

export function deplacerPoints(
  n: Niveau,
  origines: readonly Point[],
  // Reçoit le point d'origine correspondant ; renvoie sa nouvelle position.
  nouvelle: (p: Point) => Point,
  ctx: Contexte,
): Resultat<Niveau> {
  const tol = ctx.tolerance ?? 1;
  const deplaces = new Map<string, Point>();
  for (const o of origines)
    for (const { murId, extremite } of extremitesEn(n.murs, o, tol))
      deplaces.set(`${murId}:${extremite}`, nouvelle(o));

  const verrouille = n.murs.find(
    (m) => m.verrouille && (deplaces.has(`${m.id}:a`) || deplaces.has(`${m.id}:b`)),
  );
  if (verrouille) return echec('PRECONDITION', { message: 'Ce mur est verrouillé.' });

  const murs = n.murs.map((m) => ({
    ...m,
    a: deplaces.get(`${m.id}:a`) ?? m.a,
    b: deplaces.get(`${m.id}:b`) ?? m.b,
  }));
  if (murs.some((m) => m.a.x === m.b.x && m.a.y === m.b.y))
    return echec('PRECONDITION', { message: 'Un mur ne peut pas avoir une longueur nulle.' });
  const r = verifierOuvertures({ ...n, murs });
  return r.ok ? succes(avecPieces(r.data, ctx)) : r;
}

/** Coupe un mur en deux à `position` mm de son extrémité a (DES-09). */
export function scinderMur(
  n: Niveau,
  murId: string,
  position: number,
  ctx: Contexte,
): Resultat<Niveau> {
  const m = trouverMur(n, murId);
  if (!m) return echec('INTROUVABLE');
  const l = longueurMur(m);
  if (position <= 0 || position >= l)
    return echec('ENTREE_INVALIDE', { message: 'Le point de coupe doit être sur le mur.' });
  const coupe = arrondir({
    x: m.a.x + ((m.b.x - m.a.x) / l) * position,
    y: m.a.y + ((m.b.y - m.a.y) / l) * position,
  });
  const a = distance(m.a, coupe);
  if (n.ouvertures.some((o) => o.murId === murId && o.position < a && o.position + o.largeur > a))
    return echec('PRECONDITION', {
      message: 'On ne peut pas couper un mur au milieu d’une porte ou d’une fenêtre.',
    });
  const second: Mur = { ...m, id: ctx.nouvelId('m'), a: coupe };
  const murs = n.murs.flatMap((x) => (x.id === murId ? [{ ...m, b: coupe }, second] : [x]));
  const ouvertures = n.ouvertures.map((o) =>
    o.murId === murId && o.position >= a
      ? { ...o, murId: second.id, position: Math.round(o.position - a) }
      : o,
  );
  return succes(avecPieces({ ...n, murs, ouvertures }, ctx));
}

/** Réunit deux murs alignés qui se touchent, de même type et même épaisseur. */
export function fusionnerMurs(
  n: Niveau,
  id1: string,
  id2: string,
  ctx: Contexte,
): Resultat<Niveau> {
  const m1 = trouverMur(n, id1);
  const m2 = trouverMur(n, id2);
  if (!m1 || !m2) return echec('INTROUVABLE');
  const tol = ctx.tolerance ?? 1;
  if (m1.type !== m2.type || m1.epaisseur !== m2.epaisseur)
    return echec('PRECONDITION', { message: 'Les deux murs doivent être identiques.' });
  // Orientation : m1 de a vers b, m2 doit partir de m1.b.
  const m2Oriente =
    distance(m1.b, m2.a) <= tol
      ? { m: m2, inverse: false }
      : distance(m1.b, m2.b) <= tol
        ? { m: { ...m2, a: m2.b, b: m2.a }, inverse: true }
        : null;
  if (!m2Oriente) return echec('PRECONDITION', { message: 'Les murs ne se touchent pas.' });
  const v1 = { x: m1.b.x - m1.a.x, y: m1.b.y - m1.a.y };
  const v2 = { x: m2Oriente.m.b.x - m2Oriente.m.a.x, y: m2Oriente.m.b.y - m2Oriente.m.a.y };
  const sinus = (v1.x * v2.y - v1.y * v2.x) / (longueurMur(m1) * longueurMur(m2));
  if (Math.abs(sinus) > 1e-3 || v1.x * v2.x + v1.y * v2.y <= 0)
    return echec('PRECONDITION', { message: 'Les murs ne sont pas alignés.' });

  const l1 = longueurMur(m1);
  const l2 = longueurMur(m2);
  const fusion: Mur = { ...m1, b: m2Oriente.m.b };
  const murs = n.murs.filter((x) => x.id !== id2).map((x) => (x.id === id1 ? fusion : x));
  const ouvertures = n.ouvertures.map((o) =>
    o.murId === id2
      ? {
          ...o,
          murId: id1,
          position: Math.round(l1 + (m2Oriente.inverse ? l2 - o.position - o.largeur : o.position)),
        }
      : o,
  );
  return succes(avecPieces({ ...n, murs, ouvertures }, ctx));
}

export function supprimerMur(n: Niveau, murId: string, ctx: Contexte): Resultat<Niveau> {
  const m = trouverMur(n, murId);
  if (!m) return echec('INTROUVABLE');
  if (m.verrouille) return echec('PRECONDITION', { message: 'Ce mur est verrouillé.' });
  return succes(
    avecPieces(
      {
        ...n,
        murs: n.murs.filter((x) => x.id !== murId),
        ouvertures: n.ouvertures.filter((o) => o.murId !== murId),
      },
      ctx,
    ),
  );
}

export function renommerPiece(n: Niveau, pieceId: string, nom: string): Resultat<Niveau> {
  const propre = nom.trim();
  if (!propre || propre.length > 60)
    return echec('ENTREE_INVALIDE', { message: 'Le nom doit faire de 1 à 60 caractères.' });
  if (!n.pieces.some((p) => p.id === pieceId)) return echec('INTROUVABLE');
  return succes({
    ...n,
    pieces: n.pieces.map((p) => (p.id === pieceId ? { ...p, nom: propre } : p)),
  });
}

export type CibleRevetement =
  | { genre: 'mur'; murId: string; face: 'a' | 'b' }
  | { genre: 'piece'; pieceId: string; surface: 'sol' | 'plafond' };

/** Pose un revêtement sur une face de mur, un sol ou un plafond (DES-25, DES-26). */
export function appliquerRevetement(
  n: Niveau,
  cible: CibleRevetement,
  revetement: Revetement,
): Resultat<Niveau> {
  if (cible.genre === 'mur') {
    if (!trouverMur(n, cible.murId)) return echec('INTROUVABLE');
    const cle = cible.face === 'a' ? 'faceA' : 'faceB';
    return succes({
      ...n,
      murs: n.murs.map((m) => (m.id === cible.murId ? { ...m, [cle]: revetement } : m)),
    });
  }
  if (!n.pieces.some((p) => p.id === cible.pieceId)) return echec('INTROUVABLE');
  return succes({
    ...n,
    pieces: n.pieces.map((p) =>
      p.id === cible.pieceId ? { ...p, [cible.surface]: revetement } : p,
    ),
  });
}
