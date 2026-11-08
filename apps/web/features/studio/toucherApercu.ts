'use client';

import {
  clipsActifs,
  clipsVideoVisibles,
  dessinerEffet,
  dessinerSousTitresFrise,
  FORMATS_STUDIO,
  rectangleClip,
  type ContexteImage,
  type Frise,
  type LigneSousTitre,
} from '@ph/core/studio';
import { themeStudio } from '@ph/ui/tokens';
import { SELECTION_SOUS_TITRES } from './LigneSousTitres';

const ECHELLE = 0.25;
type Dessin = (ctx: ContexteImage) => void;

/** Dessine un seul élément, hors écran, au quart de la taille (pour savoir où il est). */
function horsEcran(f: Pick<Frise, 'format'>, dessin: Dessin) {
  const { largeur, hauteur } = FORMATS_STUDIO[f.format];
  const c = document.createElement('canvas');
  c.width = Math.round(largeur * ECHELLE);
  c.height = Math.round(hauteur * ECHELLE);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.setTransform(ECHELLE, 0, 0, ECHELLE, 0, 0);
  dessin(ctx as unknown as ContexteImage);
  return { ctx, l: c.width, h: c.height };
}

/** Le dessin couvre-t-il ce point (fractions de l'image, à 3 px près) ? */
function couvre(f: Pick<Frise, 'format'>, dessin: Dessin, fx: number, fy: number) {
  const { ctx, l, h } = horsEcran(f, dessin);
  const x = Math.max(0, Math.round(fx * l) - 3);
  const y = Math.max(0, Math.round(fy * h) - 3);
  const d = ctx.getImageData(x, y, 7, 7).data;
  for (let i = 3; i < d.length; i += 4) if (d[i]! > 20) return true;
  return false;
}

/** Rectangle occupé par le dessin (fractions), ou `null` s'il n'y a rien à l'image. */
export function boiteDessin(
  f: Pick<Frise, 'format'>,
  dessin: Dessin,
): { x: number; y: number; largeur: number; hauteur: number } | null {
  const { ctx, l, h } = horsEcran(f, dessin);
  const d = ctx.getImageData(0, 0, l, h).data;
  let x0 = l;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++)
      if (d[(y * l + x) * 4 + 3]! > 20) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  return x1 < 0
    ? null
    : { x: x0 / l, y: y0 / h, largeur: (x1 - x0 + 1) / l, hauteur: (y1 - y0 + 1) / h };
}

export const dessinElement = (
  f: Frise,
  id: string,
  t: number,
  lignes: readonly LigneSousTitre[],
): Dessin | null => {
  if (id === SELECTION_SOUS_TITRES)
    return (ctx) => dessinerSousTitresFrise(ctx, f, t, lignes, themeStudio);
  const a = clipsActifs(f, t).find((x) => x.clip.id === id && x.piste.type === 'texte');
  return a ? (ctx) => dessinerEffet(ctx, f, a.clip, t, themeStudio) : null;
};

/**
 * Élément de l'image sous le point cliqué, du dessus vers le dessous : sous-titres, effets
 * animés (piste du haut d'abord), puis clips vidéo (celui de devant d'abord).
 */
export function elementSous(
  f: Frise,
  t: number,
  fx: number,
  fy: number,
  lignes: readonly LigneSousTitre[],
): string | null {
  if (f.sousTitres && couvre(f, dessinElement(f, SELECTION_SOUS_TITRES, t, lignes)!, fx, fy))
    return SELECTION_SOUS_TITRES;
  for (const { piste, clip } of clipsActifs(f, t))
    if (
      piste.type === 'texte' &&
      !piste.muet &&
      couvre(f, dessinElement(f, clip.id, t, lignes)!, fx, fy)
    )
      return clip.id;
  const { largeur: L, hauteur: H } = FORMATS_STUDIO[f.format];
  for (const { clip } of [...clipsVideoVisibles(f, t)].reverse()) {
    const r = rectangleClip(f.format, clip);
    if (fx * L >= r.x && fx * L <= r.x + r.largeur && fy * H >= r.y && fy * H <= r.y + r.hauteur)
      return clip.id;
  }
  return null;
}
