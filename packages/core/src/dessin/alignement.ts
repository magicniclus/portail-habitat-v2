import { echec, succes, type Resultat } from '../resultat';
import type { Niveau, Objet, Point } from '../schemas/dessinScene';
import { contourObjet } from './emprise';
import { arrondir } from './geometrie';
import { ids, type Element } from './selection';

/** Aligner et répartir les meubles choisis ensemble (DES-29). */
export type Alignement = 'gauche' | 'centre' | 'droite' | 'haut' | 'milieu' | 'bas';

const boite = (o: Objet) => {
  const c = contourObjet(o);
  const xs = c.map((p) => p.x);
  const ys = c.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

function objetsLibres(n: Niveau, els: readonly Element[], min: number): Resultat<Objet[]> {
  const choisis = n.objets.filter((o) => ids(els, 'objet').has(o.id));
  if (choisis.length < min)
    return echec('PRECONDITION', { message: `Choisissez au moins ${min} meubles ou équipements.` });
  if (choisis.some((o) => o.verrouille))
    return echec('PRECONDITION', { message: 'Un élément choisi est verrouillé.' });
  return succes(choisis);
}

const avecPositions = (n: Niveau, pos: Map<string, Point>): Niveau => ({
  ...n,
  objets: n.objets.map((o) => {
    const p = pos.get(o.id);
    if (!p) return o;
    const { accrocheMurId: _a, ...libre } = o;
    return { ...libre, position: arrondir(p) };
  }),
});

/** Aligne les objets choisis sur le bord ou le centre de leur ensemble (boîtes englobantes). */
export function alignerObjets(
  n: Niveau,
  els: readonly Element[],
  bord: Alignement,
): Resultat<Niveau> {
  const r = objetsLibres(n, els, 2);
  if (!r.ok) return r;
  const b = r.data.map(boite);
  const g = {
    x0: Math.min(...b.map((x) => x.x0)),
    x1: Math.max(...b.map((x) => x.x1)),
    y0: Math.min(...b.map((x) => x.y0)),
    y1: Math.max(...b.map((x) => x.y1)),
  };
  const pos = new Map(
    r.data.map((o, i) => {
      const x = b[i]!;
      const dx = {
        gauche: g.x0 - x.x0,
        droite: g.x1 - x.x1,
        centre: (g.x0 + g.x1 - x.x0 - x.x1) / 2,
      };
      const dy = { haut: g.y0 - x.y0, bas: g.y1 - x.y1, milieu: (g.y0 + g.y1 - x.y0 - x.y1) / 2 };
      const p = o.position;
      return [
        o.id,
        bord in dx
          ? { x: p.x + dx[bord as keyof typeof dx], y: p.y }
          : { x: p.x, y: p.y + dy[bord as keyof typeof dy] },
      ];
    }),
  );
  return succes(avecPositions(n, pos));
}

/** Répartit les objets choisis à intervalles égaux entre les deux extrêmes (centres). */
export function repartirObjets(
  n: Niveau,
  els: readonly Element[],
  axe: 'x' | 'y',
): Resultat<Niveau> {
  const r = objetsLibres(n, els, 3);
  if (!r.ok) return r;
  const tries = [...r.data].sort((a, b) => a.position[axe] - b.position[axe]);
  const [debut, fin] = [tries[0]!.position[axe], tries.at(-1)!.position[axe]];
  const pas = (fin - debut) / (tries.length - 1);
  return succes(
    avecPositions(
      n,
      new Map(tries.map((o, i) => [o.id, { ...o.position, [axe]: debut + pas * i }])),
    ),
  );
}
