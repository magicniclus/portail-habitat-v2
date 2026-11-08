import type { Appareil } from './catalogue';
import { pastille, type Contexte2D, type ThemeStudio } from './dessin';
import { FORMATS_STUDIO, type FormatStudio } from './formats';
import type { Rectangle } from './montage';

/**
 * Écran posé dans un appareil (STUDIO.md §5 bis) : un ordinateur ou un téléphone dessiné sur un
 * fond animé, l'image (capture, vidéo) à la place de l'écran. Même géométrie pour l'aperçu et le
 * rendu : `ecranAppareil` donne où ffmpeg pose l'image, `dessinerDecor` le dessous (fond et
 * corps de l'appareil) que le robot dessine dans Chromium.
 */

/** Appareil conseillé pour un format : les écrans sont filmés en mobile pour la vidéo verticale. */
export const appareilDuFormat = (format: FormatStudio): Appareil =>
  format === 'vertical' ? 'telephone' : 'ordinateur';

const pair = (n: number) => Math.round(n / 2) * 2;

/** Place de l'écran de l'appareil dans l'image (pixels pairs, pour ffmpeg). */
export function ecranAppareil(format: FormatStudio, appareil: Appareil): Rectangle {
  const { largeur: L, hauteur: H } = FORMATS_STUDIO[format];
  let l: number;
  let h: number;
  if (appareil === 'telephone') {
    h = H * (format === 'vertical' ? 0.68 : 0.8);
    l = (h * 9) / 16;
  } else {
    l = L * { vertical: 0.86, horizontal: 0.64, carre: 0.8 }[format];
    h = (l * 9) / 16;
  }
  // Un peu au-dessus du centre : la place des textes en bas, et le pied de l'ordinateur.
  const y = (H - h) / 2 - (appareil === 'ordinateur' ? h * 0.06 : H * 0.02);
  return { x: pair((L - l) / 2), y: pair(y), largeur: pair(l), hauteur: pair(h) };
}

/** Halo flou (cercles de plus en plus grands et transparents). */
function halo(ctx: Contexte2D, x: number, y: number, r: number, couleur: string, force: number) {
  ctx.fillStyle = couleur;
  // Beaucoup d'anneaux très transparents : dégradé sans marches visibles.
  for (let i = 24; i >= 1; i--) {
    ctx.globalAlpha = force / 24;
    ctx.beginPath();
    ctx.arc(x, y, (r * i) / 24, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Fond animé : couleur de marque, deux halos qui dérivent lentement, motif de points discret. */
export function dessinerFond(
  ctx: Contexte2D,
  format: FormatStudio,
  t: number,
  th: ThemeStudio & { fond: string },
) {
  const { largeur: L, hauteur: H } = FORMATS_STUDIO[format];
  const k = Math.min(L, H) / 1080;
  ctx.save();
  ctx.fillStyle = th.fond;
  ctx.fillRect(0, 0, L, H);
  const s = t / 1000;
  halo(
    ctx,
    L * (0.15 + 0.05 * Math.sin(s * 0.35)),
    H * (0.12 + 0.04 * Math.cos(s * 0.3)),
    620 * k,
    th.accent,
    0.45,
  );
  halo(
    ctx,
    L * (0.88 + 0.04 * Math.cos(s * 0.25)),
    H * (0.9 + 0.03 * Math.sin(s * 0.4)),
    700 * k,
    th.accent,
    0.35,
  );
  halo(ctx, L * 0.5, H * 0.5, 520 * k, th.clair, 0.06);
  ctx.fillStyle = th.clair;
  ctx.globalAlpha = 0.07;
  const pas = 46 * k;
  const decale = (s * 6 * k) % pas;
  for (let y = -pas + decale; y < H + pas; y += pas)
    for (let x = 0; x < L + pas; x += pas) ctx.fillRect(x, y, 3 * k, 3 * k);
  ctx.restore();
}

/** Corps de l'appareil autour de l'écran (l'image se pose par-dessus, dans `ecranAppareil`). */
export function dessinerAppareil(
  ctx: Contexte2D,
  format: FormatStudio,
  appareil: Appareil,
  th: ThemeStudio,
) {
  const e = ecranAppareil(format, appareil);
  const k = Math.min(FORMATS_STUDIO[format].largeur, FORMATS_STUDIO[format].hauteur) / 1080;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 60 * k;
  ctx.fillStyle = th.sombre;
  if (appareil === 'telephone') {
    const b = e.largeur * 0.045;
    pastille(ctx, e.x - b, e.y - b, e.largeur + 2 * b, e.hauteur + 2 * b, e.largeur * 0.13);
    ctx.shadowBlur = 0;
  } else {
    const b = e.largeur * 0.022;
    pastille(ctx, e.x - b, e.y - b, e.largeur + 2 * b, e.hauteur + 2.6 * b, b * 1.4);
    ctx.shadowBlur = 0;
    // Socle : plateau un peu plus large que l'écran, avec l'encoche.
    const pied = e.y + e.hauteur + 2.6 * b;
    const l = e.largeur * 1.18;
    ctx.fillStyle = th.sombre;
    ctx.beginPath();
    ctx.moveTo(e.x + e.largeur / 2 - l / 2, pied);
    ctx.lineTo(e.x + e.largeur / 2 + l / 2, pied);
    ctx.lineTo(e.x + e.largeur / 2 + l / 2 - b * 1.5, pied + b * 2.2);
    ctx.lineTo(e.x + e.largeur / 2 - l / 2 + b * 1.5, pied + b * 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = th.clair;
    ctx.globalAlpha = 0.18;
    pastille(ctx, e.x + e.largeur / 2 - e.largeur * 0.08, pied, e.largeur * 0.16, b * 0.8, b * 0.4);
  }
  ctx.restore();
}

/** Rayon des coins de l'écran du téléphone (l'écran épouse la forme du corps). */
export const rayonEcran = (format: FormatStudio) =>
  Math.round(ecranAppareil(format, 'telephone').largeur * 0.085);

/**
 * Coins arrondis de l'écran du téléphone, dessinés par-dessus l'image (dans la couleur du corps) :
 * le site filmé suit la forme de l'écran, dans l'aperçu comme dans la vidéo finale.
 */
export function dessinerCoinsEcran(ctx: Contexte2D, format: FormatStudio, th: ThemeStudio) {
  const e = ecranAppareil(format, 'telephone');
  const r = rayonEcran(format);
  const coins: [number, number, number][] = [
    [e.x, e.y, Math.PI],
    [e.x + e.largeur, e.y, -Math.PI / 2],
    [e.x + e.largeur, e.y + e.hauteur, 0],
    [e.x, e.y + e.hauteur, Math.PI / 2],
  ];
  ctx.save();
  ctx.fillStyle = th.sombre;
  for (const [x, y, a] of coins) {
    // Centre de l'arc à l'intérieur de l'écran, puis le coin carré refermé sur l'arc.
    const cx = x + (x === e.x ? r : -r);
    const cy = y + (y === e.y ? r : -r);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.arc(cx, cy, r, a, a + Math.PI / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
