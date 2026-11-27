import { echec, succes, type Resultat } from '../resultat';
import type {
  CoteLibre,
  Mur,
  Niveau,
  Objet,
  Ouverture,
  Point,
  TexteLibre,
} from '../schemas/dessinScene';
import { avecPieces, type Contexte } from './commandes';
import { decaler, parGenre, type Element } from './selection';

/** Copie de la sélection (presse-papier de l'éditeur) : les baies suivent leurs murs. */
export interface Copie {
  murs: Mur[];
  ouvertures: Ouverture[];
  objets: Objet[];
  cotes: CoteLibre[];
  textes: TexteLibre[];
}

export function copierElements(n: Niveau, els: readonly Element[]): Copie {
  const { murs, objets, cotes, textes } = parGenre(els);
  return {
    murs: n.murs.filter((m) => murs.has(m.id)),
    ouvertures: n.ouvertures.filter((o) => murs.has(o.murId)),
    objets: n.objets.filter((o) => objets.has(o.id)),
    cotes: n.cotes.filter((c) => cotes.has(c.id)),
    textes: n.textes.filter((t) => textes.has(t.id)),
  };
}

/** Colle une copie (même niveau ou un autre), décalée de `d` ; nouveaux identifiants, déverrouillés. */
export function collerElements(
  n: Niveau,
  c: Copie,
  d: Point,
  ctx: Contexte,
): Resultat<Niveau & { elements: Element[] }> {
  const total = c.murs.length + c.objets.length + c.cotes.length + c.textes.length;
  if (!total)
    return echec('PRECONDITION', { message: 'Rien à coller : copiez d’abord une sélection.' });
  if (n.murs.length + c.murs.length > 2_000 || n.objets.length + c.objets.length > 2_000)
    return echec('PRECONDITION', { message: 'Trop d’éléments sur ce niveau.' });
  const nouveauxMurs = new Map(c.murs.map((m) => [m.id, ctx.nouvelId('m')]));
  const murs = c.murs.map((m) => ({
    ...m,
    id: nouveauxMurs.get(m.id)!,
    a: decaler(m.a, d),
    b: decaler(m.b, d),
    verrouille: false,
  }));
  const ouvertures = c.ouvertures.map((o) => ({
    ...o,
    id: ctx.nouvelId('o'),
    murId: nouveauxMurs.get(o.murId)!,
  }));
  const objets = c.objets.map(({ accrocheMurId: _a, verrouille: _v, ...o }) => ({
    ...o,
    id: ctx.nouvelId('obj'),
    position: decaler(o.position, d),
  }));
  const cotes = c.cotes.map((x) => ({
    ...x,
    id: ctx.nouvelId('c'),
    a: decaler(x.a, d),
    b: decaler(x.b, d),
  }));
  const textes = c.textes.map((t) => ({
    ...t,
    id: ctx.nouvelId('t'),
    position: decaler(t.position, d),
  }));
  const suite = {
    ...n,
    murs: [...n.murs, ...murs],
    ouvertures: [...n.ouvertures, ...ouvertures],
    objets: [...n.objets, ...objets],
    cotes: [...n.cotes, ...cotes],
    textes: [...n.textes, ...textes],
  };
  return succes({
    ...(murs.length ? avecPieces(suite, ctx) : suite),
    elements: [
      ...murs.map((m) => ({ genre: 'mur' as const, id: m.id })),
      ...objets.map((o) => ({ genre: 'objet' as const, id: o.id })),
      ...cotes.map((x) => ({ genre: 'cote' as const, id: x.id })),
      ...textes.map((t) => ({ genre: 'texte' as const, id: t.id })),
    ],
  });
}
