import type { Mur, Ouverture } from '../schemas/dessinScene';
import type { Matiere, PieceMenuiserie } from './menuiseries3d';
import { longueurMur } from './murs';

/** Pavé dans le repère du mur : s le long du mur, t vers la face A, z en hauteur (centres). */
export type Local = {
  s: number;
  t: number;
  z: number;
  l: number;
  e: number;
  h: number;
  ang: number;
  matiere: Matiere;
};

/** Volets côté extérieur : coffre du roulant, ou battants ouverts contre la façade. */
export function volets(o: Ouverture, ep: number, vi: 1 | -1): Local[] {
  const out: Local[] = [];
  const [p0, p1] = [o.position, o.position + o.largeur];
  const [bas, haut] = [o.allege, o.allege + o.hauteur];
  const ext = -vi * (ep / 2 + 100);
  if (o.volet === 'roulant')
    out.push({
      s: (p0 + p1) / 2,
      t: ext,
      z: haut + 100,
      l: o.largeur + 100,
      e: 200,
      h: 200,
      matiere: 'volet',
      ang: 0,
    });
  if (o.volet === 'battant') {
    const nv = o.largeur > 900 ? 2 : 1;
    const wv = o.largeur / nv;
    const t = -vi * (ep / 2 + 20);
    out.push({
      s: p0 - wv / 2,
      t,
      z: (bas + haut) / 2,
      l: wv,
      e: 30,
      h: o.hauteur,
      matiere: 'volet',
      ang: 0,
    });
    if (nv === 2)
      out.push({
        s: p1 + wv / 2,
        t,
        z: (bas + haut) / 2,
        l: wv,
        e: 30,
        h: o.hauteur,
        matiere: 'volet',
        ang: 0,
      });
  }

  return out;
}

/** Repère du mur (s, t, z) → repère du plan (x, y, z) et angle au sol. */
export function versLePlan(out: Local[], m: Mur, altitude: number): PieceMenuiserie[] {
  const L = longueurMur(m);
  const u = { x: (m.b.x - m.a.x) / L, y: (m.b.y - m.a.y) / L };
  const angleMur = Math.atan2(u.y, u.x);
  return out.map((p) => ({
    matiere: p.matiere,
    centre: {
      x: m.a.x + u.x * p.s - u.y * p.t,
      y: m.a.y + u.y * p.s + u.x * p.t,
      z: altitude + p.z,
    },
    taille: { l: p.l, p: p.e, h: p.h },
    angle: angleMur + p.ang,
  }));
}
