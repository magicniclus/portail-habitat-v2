import { echec, succes, type Resultat } from '../resultat';
import type { Mur, Niveau, Point, Revetement } from '../schemas/dessinScene';
import { appliquerRevetement, scinderMur, type Contexte } from './commandes';
import { distancePointSegment, projeter } from './geometrie';
import { longueurMur } from './murs';

/**
 * Pans de mur (DES-25) : la face d'un mur qui traverse plusieurs pièces est découpée par les
 * cloisons qui la rejoignent en T. On sélectionne et on peint un pan, pas tout le mur.
 */

/** Coupes (mm depuis a) et demi-épaisseur des murs qui rejoignent la face en T. */
function jonctions(n: Pick<Niveau, 'murs'>, m: Mur, face: 'a' | 'b') {
  const l = longueurMur(m);
  const nl = { x: -(m.b.y - m.a.y) / l, y: (m.b.x - m.a.x) / l };
  const cote = face === 'a' ? 1 : -1;
  return n.murs
    .filter((w) => w.id !== m.id && w.type !== 'separation' && w.type !== 'poutre')
    .flatMap((w) =>
      (['a', 'b'] as const).flatMap((bout) => {
        const q = w[bout];
        const autre = w[bout === 'a' ? 'b' : 'a'];
        if (distancePointSegment(q, m.a, m.b) > m.epaisseur / 2 + 1) return [];
        const s = projeter(q, m.a, m.b).t * l;
        if (s <= 1 || s >= l - 1) return [];
        // Le mur part du côté de cette face ?
        const sens = (autre.x - q.x) * nl.x + (autre.y - q.y) * nl.y;
        return sens * cote > 0 ? [{ s: Math.round(s), demi: w.epaisseur / 2 }] : [];
      }),
    )
    .sort((x, y) => x.s - y.s);
}

/**
 * Pan de la face sous le point `s` (mm depuis a) : `coupe` entre axes des cloisons (où scinder
 * le mur), `visible` entre leurs faces (ce qu'on voit et surligne).
 */
export function panDeMur(
  n: Pick<Niveau, 'murs'>,
  murId: string,
  face: 'a' | 'b',
  s: number,
): { coupe: [number, number]; visible: [number, number] } | null {
  const m = n.murs.find((x) => x.id === murId);
  if (!m) return null;
  const l = Math.round(longueurMur(m));
  const j = jonctions(n, m, face);
  const avant = [...j].reverse().find((x) => x.s <= s);
  const apres = j.find((x) => x.s > s);
  return {
    coupe: [avant?.s ?? 0, apres?.s ?? l],
    visible: [avant ? avant.s + avant.demi : 0, apres ? apres.s - apres.demi : l],
  };
}

/**
 * Revêt un seul pan de la face (DES-25) : le mur est coupé aux cloisons qui bornent ce pan
 * (géométrie inchangée), puis seul le morceau visé reçoit le revêtement. Renvoie aussi le mur
 * revêtu, pour le garder sélectionné.
 */
export function revetirPan(
  n: Niveau,
  e: { murId: string; face: 'a' | 'b'; s: number; revetement: Revetement },
  ctx: Contexte,
): Resultat<Niveau & { murId: string }> {
  const m = n.murs.find((x) => x.id === e.murId);
  const pan = panDeMur(n, e.murId, e.face, e.s);
  if (!m || !pan) return echec('INTROUVABLE');
  const l = Math.round(longueurMur(m));
  // Point du pan, pour retrouver son morceau après les coupes.
  const t = (pan.coupe[0] + pan.coupe[1]) / 2 / l;
  const repere: Point = { x: m.a.x + (m.b.x - m.a.x) * t, y: m.a.y + (m.b.y - m.a.y) * t };
  let suite: Niveau = n;
  if (pan.coupe[1] < l) {
    const r = scinderMur(suite, e.murId, pan.coupe[1], ctx);
    if (!r.ok) return r;
    suite = r.data;
  }
  if (pan.coupe[0] > 0) {
    const r = scinderMur(suite, e.murId, pan.coupe[0], ctx);
    if (!r.ok) return r;
    suite = r.data;
  }
  const morceau = suite.murs.find(
    (w) =>
      distancePointSegment(repere, w.a, w.b) < 1 &&
      Math.abs((w.b.x - w.a.x) * (m.b.y - m.a.y) - (w.b.y - w.a.y) * (m.b.x - m.a.x)) <
        1e-3 * l * l,
  )!;
  const r = appliquerRevetement(
    suite,
    { genre: 'mur', murId: morceau.id, face: e.face },
    e.revetement,
  );
  return r.ok ? succes({ ...r.data, murId: morceau.id }) : r;
}
