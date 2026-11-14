/**
 * Transitions entre deux séquences et effets vidéo de la frise (STUDIO.md §5 bis) : catalogue,
 * état d'une transition à un instant (aperçu) et filtres ffmpeg équivalents (rendu).
 */

export const TRANSITIONS = [
  'fondu',
  'noir',
  'blanc',
  'glisserGauche',
  'glisserDroite',
  'glisserHaut',
  'glisserBas',
  'zoom',
  'flou',
  'balayage',
] as const;
export type Transition = (typeof TRANSITIONS)[number];
export const LIBELLES_TRANSITION: Readonly<Record<Transition, string>> = {
  fondu: 'Fondu enchaîné',
  noir: 'Passage au noir',
  blanc: 'Flash blanc',
  glisserGauche: 'Glisser vers la gauche',
  glisserDroite: 'Glisser vers la droite',
  glisserHaut: 'Glisser vers le haut',
  glisserBas: 'Glisser vers le bas',
  zoom: 'Zoom',
  flou: 'Flou',
  balayage: 'Balayage',
};
/** Transitions qui laissent voir la séquence d'avant sous la nouvelle (prolongée dessous). */
const ENCHAINEES: ReadonlySet<Transition> = new Set([
  'fondu',
  'glisserGauche',
  'glisserDroite',
  'glisserHaut',
  'glisserBas',
  'zoom',
  'flou',
  'balayage',
]);
export const transitionEnchainee = (t: Transition) => ENCHAINEES.has(t);

export const EFFETS_VIDEO = [
  'sepia',
  'vintage',
  'negatif',
  'vignette',
  'grain',
  'miroir',
  'pixel',
  'tremblement',
  'pulsation',
  'rgb',
] as const;
export type EffetVideo = (typeof EFFETS_VIDEO)[number];
export const LIBELLES_EFFET_VIDEO: Readonly<Record<EffetVideo, string>> = {
  sepia: 'Sépia',
  vintage: 'Vintage',
  negatif: 'Négatif',
  vignette: 'Vignette',
  grain: 'Grain de film',
  miroir: 'Miroir',
  pixel: 'Pixels',
  tremblement: 'Tremblement',
  pulsation: 'Pulsation',
  rgb: 'Décalage RGB',
};

/** Effets d'un clip et de sa piste, sans doublon. */
export function effetsDe(
  p: { effets?: readonly EffetVideo[] | undefined },
  c: { effets?: readonly EffetVideo[] | undefined },
): EffetVideo[] {
  return [...new Set([...(p.effets ?? []), ...(c.effets ?? [])])];
}

/** Effets qui se font par filtre CSS dans l'aperçu (le reste est dessiné). */
export function filtreCssEffets(effets: readonly EffetVideo[]): string[] {
  const r: string[] = [];
  if (effets.includes('sepia')) r.push('sepia(0.85)');
  if (effets.includes('vintage')) r.push('sepia(0.4) contrast(1.15) saturate(0.75)');
  if (effets.includes('negatif')) r.push('invert(1)');
  return r;
}

/** Mouvement d'un effet animé à l'instant `local` (ms dans le clip) : décalage et échelle. */
export function mouvementEffets(
  effets: readonly EffetVideo[],
  local: number,
): { dx: number; dy: number; echelle: number } {
  const tremble = effets.includes('tremblement');
  return {
    dx: tremble ? Math.round(Math.sin(local * 0.09) * 10) : 0,
    dy: tremble ? Math.round(Math.cos(local * 0.13) * 8) : 0,
    echelle: effets.includes('pulsation') ? 1 + 0.04 * Math.sin((local / 600) * 2 * Math.PI) : 1,
  };
}

/**
 * État d'une transition d'entrée à `local` ms du début du clip : opacité, décalage (fraction de
 * l'image), échelle, flou (px), voile de couleur (noir, blanc) et part révélée (balayage).
 */
export function etatTransition(
  tr: { type: Transition; duree: number } | undefined,
  local: number,
): {
  alpha: number;
  dx: number;
  dy: number;
  echelle: number;
  flou: number;
  voile: { couleur: 'noir' | 'blanc'; alpha: number } | null;
  revele: number;
} {
  const neutre = { alpha: 1, dx: 0, dy: 0, echelle: 1, flou: 0, voile: null, revele: 1 };
  if (!tr || local >= tr.duree) return neutre;
  const p = Math.max(0, local / tr.duree);
  const reste = 1 - p;
  switch (tr.type) {
    case 'fondu':
      return { ...neutre, alpha: p };
    case 'noir':
    case 'blanc':
      return { ...neutre, voile: { couleur: tr.type, alpha: reste } };
    case 'glisserGauche':
      return { ...neutre, dx: reste };
    case 'glisserDroite':
      return { ...neutre, dx: -reste };
    case 'glisserHaut':
      return { ...neutre, dy: reste };
    case 'glisserBas':
      return { ...neutre, dy: -reste };
    case 'zoom':
      return { ...neutre, alpha: p, echelle: 1 + 0.25 * reste };
    case 'flou':
      return { ...neutre, alpha: p, flou: Math.round(20 * reste) };
    case 'balayage':
      return { ...neutre, revele: p };
  }
}

const sec = (ms: number) => +(ms / 1000).toFixed(3);

/** Effets vidéo en filtres ffmpeg (avant la mise au format avec transparence). */
export function effetsVideoFfmpeg(effets: readonly EffetVideo[]): string[] {
  const r: string[] = [];
  if (effets.includes('sepia'))
    r.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
  if (effets.includes('vintage')) r.push('curves=preset=vintage');
  if (effets.includes('negatif')) r.push('negate');
  if (effets.includes('miroir')) r.push('hflip');
  if (effets.includes('pixel')) r.push('pixelize=w=24:h=24');
  if (effets.includes('rgb')) r.push('rgbashift=rh=-8:bh=8');
  if (effets.includes('grain')) r.push('noise=alls=25:allf=t');
  if (effets.includes('vignette')) r.push('vignette=PI/4');
  return r;
}

/**
 * Transition d'entrée en filtres ffmpeg, temps `t` local au clip : opacité ou voile (avant la
 * pose), et position animée de l'incrustation (`x`, `y` d'overlay, temps global `debut`).
 */
export function transitionFfmpeg(
  tr: { type: Transition; duree: number } | undefined,
  o: { debut: number; x: number; y: number; largeur: number; hauteur: number },
): { filtres: string[]; x: string; y: string } {
  const pos = { x: String(o.x), y: String(o.y) };
  if (!tr) return { filtres: [], ...pos };
  const d = sec(tr.duree);
  const reste = `max(0,1-(t-${sec(o.debut)})/${d})`;
  const fondu = `fade=t=in:st=0:d=${d}:alpha=1`;
  switch (tr.type) {
    case 'fondu':
      return { filtres: [fondu], ...pos };
    case 'noir':
      return { filtres: [`fade=t=in:st=0:d=${d}:color=black`], ...pos };
    case 'blanc':
      return { filtres: [`fade=t=in:st=0:d=${d}:color=white`], ...pos };
    case 'glisserGauche':
      return { filtres: [], x: `${o.x}+${o.largeur}*${reste}`, y: pos.y };
    case 'glisserDroite':
      return { filtres: [], x: `${o.x}-${o.largeur}*${reste}`, y: pos.y };
    case 'glisserHaut':
      return { filtres: [], x: pos.x, y: `${o.y}+${o.hauteur}*${reste}` };
    case 'glisserBas':
      return { filtres: [], x: pos.x, y: `${o.y}-${o.hauteur}*${reste}` };
    case 'zoom':
      return {
        filtres: [
          `scale=w='trunc(${o.largeur}*(1+0.25*max(0,1-t/${d}))/2)*2':h='trunc(${o.hauteur}*(1+0.25*max(0,1-t/${d}))/2)*2':eval=frame`,
          fondu,
        ],
        x: `${o.x}+(${o.largeur}-overlay_w)/2`,
        y: `${o.y}+(${o.hauteur}-overlay_h)/2`,
      };
    case 'flou':
      return { filtres: [`gblur=sigma=10:enable='lt(t,${d})'`, fondu], ...pos };
    case 'balayage':
      return {
        filtres: [`geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='alpha(X,Y)*lt(X,W*T/${d})'`],
        ...pos,
      };
  }
}
