import type { Scene } from '../schemas/dessinScene';
import { niveauxTries } from './niveaux';
import { contourMur } from './murs';

/** Taille du carré de l'aperçu (unités du `viewBox`). */
export const TAILLE_APERCU = 100;
/** Longueur maximale de l'aperçu enregistré avec les métadonnées du plan. */
const LONGUEUR_MAX = 4_000;

/**
 * Aperçu de « Mes plans » (DES-02) : contours des murs du niveau le plus bas (rez-de-chaussée
 * s'il existe), ramenés dans un carré de 100 et arrondis à l'unité. Données `d` d'un chemin SVG,
 * calculées par le serveur à chaque enregistrement : aucune image à produire ni à stocker.
 * Chaîne vide si le niveau n'a pas de mur ; tronquée aux murs entiers qui tiennent.
 */
export function apercuPlan(s: Pick<Scene, 'niveaux'>): string {
  const tries = niveauxTries(s);
  const n = tries.find((x) => x.type === 'rdc') ?? tries[0];
  const murs = (n?.murs ?? []).filter((m) => m.type !== 'separation');
  if (!murs.length) return '';
  const contours = murs.map((m) => contourMur(m));
  const pts = contours.flat();
  const [x0, y0] = [Math.min(...pts.map((p) => p.x)), Math.min(...pts.map((p) => p.y))];
  const cote = Math.max(
    Math.max(...pts.map((p) => p.x)) - x0,
    Math.max(...pts.map((p) => p.y)) - y0,
    1,
  );
  const k = (TAILLE_APERCU - 4) / cote;
  let d = '';
  for (const c of contours) {
    const morceau =
      c
        .map(
          (p, i) =>
            `${i ? 'L' : 'M'}${Math.round(2 + (p.x - x0) * k)} ${Math.round(2 + (p.y - y0) * k)}`,
        )
        .join('') + 'Z';
    if (d.length + morceau.length > LONGUEUR_MAX) break;
    d += morceau;
  }
  return d;
}
