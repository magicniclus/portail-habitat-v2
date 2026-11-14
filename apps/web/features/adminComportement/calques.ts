import { TAILLE_CELLULE } from '@ph/core/comportement';
import { echelleChaleur } from '@ph/ui/tokens';

/**
 * Dessin des cartes de chaleur (COMPORTEMENT §4) : noyau radial de 30 px autour de chaque
 * cellule, normalisé au 99e centile pour qu'un point très chaud n'écrase pas le reste.
 */
const RAYON = 30;

let palette: Uint8ClampedArray | undefined;
function lirePalette() {
  if (palette) return palette;
  const g = document.createElement('canvas').getContext('2d')!;
  const d = g.createLinearGradient(0, 0, 256, 0);
  for (const [o, c] of echelleChaleur) d.addColorStop(o, c);
  g.fillStyle = d;
  g.fillRect(0, 0, 256, 1);
  return (palette = g.getImageData(0, 0, 256, 1).data);
}

function centile99(valeurs: number[]) {
  if (!valeurs.length) return 1;
  const t = [...valeurs].sort((a, b) => a - b);
  return t[Math.min(t.length - 1, Math.floor(t.length * 0.99))] || 1;
}

/** Cellules `"colonne:ligne" → valeur` dessinées sur un canevas à l'échelle `echelle`. */
export function dessinerChaleur(
  ctx: CanvasRenderingContext2D,
  cellules: Record<string, number>,
  echelle: number,
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  const valeurs = Object.values(cellules);
  const max = centile99(valeurs);
  const r = RAYON * echelle;
  for (const [cle, v] of Object.entries(cellules)) {
    const [col, ligne] = cle.split(':').map(Number) as [number, number];
    const x = (col + 0.5) * TAILLE_CELLULE * echelle;
    const y = (ligne + 0.5) * TAILLE_CELLULE * echelle;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${Math.min(1, v / max)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  const img = ctx.getImageData(0, 0, width, height);
  const px = img.data;
  const pal = lirePalette();
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3]!;
    if (!a) continue;
    px[i] = pal[a * 4]!;
    px[i + 1] = pal[a * 4 + 1]!;
    px[i + 2] = pal[a * 4 + 2]!;
    px[i + 3] = Math.min(235, 40 + a * 0.8);
  }
  ctx.putImageData(img, 0, 0);
}

/** Part des visiteurs qui atteignent la hauteur `y` (paliers de 5 %). */
export function atteinte(scroll: readonly number[], sessions: number, y: number, hauteur: number) {
  if (!sessions) return 0;
  const palier = Math.floor((y / Math.max(1, hauteur)) * 20);
  if (palier <= 0) return 1;
  return (scroll[Math.min(19, palier - 1)] ?? 0) / sessions;
}

/** Bandes du défilement : du chaud (tous) au froid (personne). */
export function dessinerDefilement(
  ctx: CanvasRenderingContext2D,
  scroll: readonly number[],
  sessions: number,
  hauteur: number,
  echelle: number,
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  for (let y = 0; y < hauteur; y += 10) {
    const v = atteinte(scroll, sessions, y, hauteur);
    ctx.fillStyle = `hsla(${Math.round((1 - v) * 230)},85%,50%,0.45)`;
    ctx.fillRect(0, y * echelle, width, 10 * echelle + 1);
  }
}

/** Élément d'une clé du traceur : `data-ph`, sinon `section>balise:rang`. */
export function trouverElement(doc: Document, cle: string): Element | null {
  const m = /^(.+)>([a-z0-9-]+):(\d+)$/.exec(cle);
  if (!m) return doc.querySelector(`[data-ph="${CSS.escape(cle)}"]`);
  const [, section, balise, rang] = m;
  const racine =
    section === 'page'
      ? doc.body
      : doc.querySelector(`[data-ph-section="${CSS.escape(section!)}"]`);
  for (const el of racine?.getElementsByTagName(balise!) ?? []) {
    let n = 1;
    for (let s = el.previousElementSibling; s; s = s.previousElementSibling)
      if (s.tagName === el.tagName) n++;
    if (n === Number(rang)) return el;
  }
  return null;
}
