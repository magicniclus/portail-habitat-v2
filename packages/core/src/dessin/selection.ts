import { echec, succes, type Resultat } from '../resultat';
import type { Niveau, Point } from '../schemas/dessinScene';
import { avecPieces, deplacerPoints, type Contexte } from './commandes';
import { arrondir } from './geometrie';

/**
 * Sélection multiple (DES-29) : murs, objets, cotes libres et textes choisis ensemble (Maj +
 * clic, rectangle), déplacés, supprimés, copiés, collés, alignés, répartis, verrouillés.
 */
export type GenreMultiple = 'mur' | 'objet' | 'cote' | 'texte';
export interface Element {
  genre: GenreMultiple;
  id: string;
}

export const ids = (els: readonly Element[], genre: GenreMultiple) =>
  new Set(els.filter((e) => e.genre === genre).map((e) => e.id));
/** Identifiants choisis, rangés par genre. */
export const parGenre = (els: readonly Element[]) => ({
  murs: ids(els, 'mur'),
  objets: ids(els, 'objet'),
  cotes: ids(els, 'cote'),
  textes: ids(els, 'texte'),
});

/** Éléments entièrement compris dans le rectangle a–b (murs : leurs deux extrémités). */
export function elementsDansRectangle(n: Niveau, a: Point, b: Point): Element[] {
  const [x0, x1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
  const [y0, y1] = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
  const dedans = (p: Point) => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1;
  return [
    ...n.murs
      .filter((m) => dedans(m.a) && dedans(m.b))
      .map((m) => ({ genre: 'mur' as const, id: m.id })),
    ...n.objets
      .filter((o) => dedans(o.position))
      .map((o) => ({ genre: 'objet' as const, id: o.id })),
    ...n.cotes
      .filter((c) => dedans(c.a) && dedans(c.b))
      .map((c) => ({ genre: 'cote' as const, id: c.id })),
    ...n.textes
      .filter((t) => dedans(t.position))
      .map((t) => ({ genre: 'texte' as const, id: t.id })),
  ];
}

export const decaler = (p: Point, d: Point) => arrondir({ x: p.x + d.x, y: p.y + d.y });

/** Déplace la sélection ; les murs raccordés suivent, un élément verrouillé bloque tout. */
export function deplacerElements(
  n: Niveau,
  els: readonly Element[],
  d: Point,
  ctx: Contexte,
): Resultat<Niveau> {
  const { murs, objets, cotes, textes } = parGenre(els);
  if (n.objets.some((o) => objets.has(o.id) && o.verrouille))
    return echec('PRECONDITION', { message: 'Un élément choisi est verrouillé.' });
  const points = n.murs.filter((m) => murs.has(m.id)).flatMap((m) => [m.a, m.b]);
  const uniques = points.filter(
    (p, i) => points.findIndex((q) => q.x === p.x && q.y === p.y) === i,
  );
  const r = uniques.length ? deplacerPoints(n, uniques, (p) => decaler(p, d), ctx) : succes(n);
  if (!r.ok) return r;
  return succes({
    ...r.data,
    objets: r.data.objets.map((o) =>
      objets.has(o.id) ? { ...o, position: decaler(o.position, d) } : o,
    ),
    cotes: r.data.cotes.map((c) =>
      cotes.has(c.id) ? { ...c, a: decaler(c.a, d), b: decaler(c.b, d) } : c,
    ),
    textes: r.data.textes.map((t) =>
      textes.has(t.id) ? { ...t, position: decaler(t.position, d) } : t,
    ),
  });
}

/** Supprime la sélection ; refus si un élément est verrouillé, ou un mur porteur non confirmé. */
export function supprimerElements(
  n: Niveau,
  els: readonly Element[],
  ctx: Contexte,
  confirmePorteur = false,
): Resultat<Niveau> {
  const { murs, objets, cotes, textes } = parGenre(els);
  const choisis = [
    ...n.murs.filter((m) => murs.has(m.id)),
    ...n.objets.filter((o) => objets.has(o.id)),
  ];
  if (choisis.some((x) => x.verrouille))
    return echec('PRECONDITION', { message: 'Un élément choisi est verrouillé.' });
  if (!confirmePorteur && n.murs.some((m) => murs.has(m.id) && m.porteur))
    return echec('PRECONDITION', {
      message: 'La sélection contient un mur porteur : confirmez la suppression.',
    });
  const reste = {
    ...n,
    murs: n.murs.filter((m) => !murs.has(m.id)),
    ouvertures: n.ouvertures.filter((o) => !murs.has(o.murId)),
    objets: n.objets.filter((o) => !objets.has(o.id)),
    cotes: n.cotes.filter((c) => !cotes.has(c.id)),
    textes: n.textes.filter((t) => !textes.has(t.id)),
  };
  return succes(murs.size ? avecPieces(reste, ctx) : reste);
}

/** Verrouille ou déverrouille des murs et des objets (les autres genres n'ont pas de verrou). */
export function verrouillerElements(
  n: Niveau,
  els: readonly Element[],
  valeur: boolean,
): Resultat<Niveau> {
  const [murs, objets] = [ids(els, 'mur'), ids(els, 'objet')];
  if (!murs.size && !objets.size)
    return echec('PRECONDITION', { message: 'Seuls les murs et les meubles se verrouillent.' });
  return succes({
    ...n,
    murs: n.murs.map((m) => (murs.has(m.id) ? { ...m, verrouille: valeur } : m)),
    objets: n.objets.map((o) => (objets.has(o.id) ? { ...o, verrouille: valeur } : o)),
  });
}
