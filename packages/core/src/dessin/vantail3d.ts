import type { Ouverture } from '../schemas/dessinScene';
import { remplissageDe } from './menuiseries';
import type { Matiere } from './menuiseries3d';

/** Largeur des montants et traverses d'un ouvrant (mm). */
const OUVRANT = 50;

/** Contenu d'un vantail dans son repère : x de 0 (charnière) à w, z de z0 à z1, dt en épaisseur. */
export function vantail(
  o: Ouverture,
  w: number,
  z0: number,
  z1: number,
  poignee: boolean,
  zPoignee: number,
) {
  const p: {
    x: number;
    dt: number;
    z: number;
    l: number;
    e: number;
    h: number;
    matiere: Matiere;
  }[] = [];
  const h = z1 - z0;
  const boite = (x0: number, x1: number, b: number, t: number, matiere: Matiere, e = 40, dt = 0) =>
    p.push({ x: (x0 + x1) / 2, dt, z: (b + t) / 2, l: x1 - x0, e, h: t - b, matiere });
  const r = remplissageDe(o);
  const verre = (b: number, t: number) => {
    boite(OUVRANT, w - OUVRANT, b, t, 'verre', 8);
    const { colonnes = 1, rangees = 1 } = o.petitsBois ?? {};
    const lv = w - 2 * OUVRANT;
    for (let i = 1; i < colonnes; i++) {
      const x = OUVRANT + (lv * i) / colonnes;
      boite(x - 10, x + 10, b, t, 'petit_bois', 24);
    }
    for (let j = 1; j < rangees; j++) {
      const z = b + ((t - b) * j) / rangees;
      boite(OUVRANT, w - OUVRANT, z - 10, z + 10, 'petit_bois', 24);
    }
  };
  if (r === 'plein' || r === 'cassettes') {
    boite(0, w, z0, z1, 'panneau');
    if (r === 'cassettes')
      for (const [b, t] of [
        [z0 + h * 0.08, z0 + h * 0.42],
        [z0 + h * 0.52, z0 + h * 0.9],
      ] as const)
        for (const dt of [-25, 25]) boite(w * 0.15, w * 0.85, b, t, 'panneau', 10, dt);
  } else {
    // Ouvrant : montants et traverses, puis vitrage (semi-vitré : panneau en bas).
    boite(0, OUVRANT, z0, z1, 'cadre');
    boite(w - OUVRANT, w, z0, z1, 'cadre');
    boite(OUVRANT, w - OUVRANT, z1 - OUVRANT, z1, 'cadre');
    boite(OUVRANT, w - OUVRANT, z0, z0 + OUVRANT, 'cadre');
    if (r === 'semi_vitre') {
      const milieu = z0 + h * 0.42;
      boite(OUVRANT, w - OUVRANT, z0 + OUVRANT, milieu, 'panneau', 30);
      boite(OUVRANT, w - OUVRANT, milieu, milieu + OUVRANT, 'cadre');
      verre(milieu + OUVRANT, z1 - OUVRANT);
    } else verre(z0 + OUVRANT, z1 - OUVRANT);
  }
  if (poignee) boite(w - 90, w - 50, zPoignee - 60, zPoignee + 60, 'poignee', 90);
  return p;
}
