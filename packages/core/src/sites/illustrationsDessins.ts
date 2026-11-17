/**
 * Dessins des illustrations des sites (style « illustration d'agence » à plat : personnages en
 * bleu de travail, maison en coupe, grands outils, soleil, nuages, feuillages). Chaque scène est
 * tracée avec les couleurs reçues : palette du site (`p` principale, `a` accent, `c` fond clair,
 * `s` sombre) et teintes des personnages (`peau`, `cheveux`).
 */
export interface Pinceaux {
  p: string;
  /** Feuillage et nuages : la principale, ou l'accent si la principale est un gris ou un noir. */
  f: string;
  a: string;
  c: string;
  s: string;
  peau: string;
  cheveux: string;
}

export const LARGEUR = 1200;
export const HAUTEUR = 800;
const SOL = 700;

const op = (o?: number) => (o === undefined ? '' : ` opacity="${o}"`);
const rect = (x: number, y: number, w: number, h: number, f: string, o?: number, rx = 0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"${op(o)}/>`;
const rond = (x: number, y: number, r: number, f: string, o?: number) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${op(o)}/>`;
const forme = (d: string, f: string, o?: number) => `<path d="${d}" fill="${f}"${op(o)}/>`;
const ligne = (d: string, c: string, w: number, o?: number) =>
  `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op(o)}/>`;
const groupe = (t: string, contenu: string) => `<g transform="${t}">${contenu}</g>`;

/* ---------- Décor ---------- */

const soleil = (k: Pinceaux, x: number, y: number) =>
  [
    ...Array.from({ length: 10 }, (_, i) => {
      const a = (i * Math.PI) / 5;
      return ligne(
        `M${x + Math.cos(a) * 66} ${y + Math.sin(a) * 66} L${x + Math.cos(a) * 88} ${y + Math.sin(a) * 88}`,
        k.a,
        7,
        0.8,
      );
    }),
    rond(x, y, 52, k.a, 0.9),
  ].join('');

const nuage = (k: Pinceaux, x: number, y: number, e = 1) =>
  groupe(
    `translate(${x} ${y}) scale(${e})`,
    forme(
      'M0 40 q 0 -26 30 -26 q 8 -30 44 -26 q 30 -24 60 6 q 34 -2 34 28 q 0 18 -20 18 H18 q -18 0 -18 0Z',
      k.p,
      0.22,
    ),
  );

/** Grande feuille (tige au point d'ancrage, pointe vers le haut avant rotation). */
const feuille = (x: number, y: number, h: number, angle: number, f: string, o?: number) =>
  groupe(
    `translate(${x} ${y}) rotate(${angle})`,
    forme(
      `M0 0 C ${-h * 0.42} ${-h * 0.35} ${-h * 0.3} ${-h * 0.85} 0 ${-h} C ${h * 0.3} ${-h * 0.85} ${h * 0.42} ${-h * 0.35} 0 0Z`,
      f,
      o,
    ) + ligne(`M0 0 L0 ${-h * 0.9}`, 'white', 2, 0.45),
  );

/** Touffe de feuillage au pied d'une scène. */
const touffe = (k: Pinceaux, x: number, y: number, e = 1) =>
  groupe(
    `translate(${x} ${y}) scale(${e})`,
    [
      feuille(0, 0, 170, -38, k.f, 0.5),
      feuille(8, 0, 210, -8, k.f, 0.72),
      feuille(14, 0, 160, 30, k.f, 0.42),
      feuille(-6, 0, 120, -70, k.f, 0.35),
      feuille(20, 0, 120, 62, k.f, 0.6),
    ].join(''),
  );

/** Fond commun : blanc, nuages, soleil, sol. */
function fond(k: Pinceaux, soleilX = 980): string {
  return [
    rect(0, 0, LARGEUR, HAUTEUR, 'white'),
    rect(0, 0, LARGEUR, HAUTEUR, k.c, 0.6),
    nuage(k, 110, 120, 1.1),
    nuage(k, 640, 80, 0.8),
    nuage(k, 870, 220, 0.9),
    soleil(k, soleilX, 150),
    ligne(`M60 ${SOL} H1140`, k.s, 6, 0.7),
  ].join('');
}

/* ---------- Personnage ---------- */

interface Pose {
  /** Écart des bras vers l'extérieur (degrés ; 0 = le long du corps, 180 = levé). */
  bras?: [number, number];
  /** Outil tenu dans la main droite (dessiné à l'origine de la main). */
  outil?: string;
  casquette?: boolean;
  /** Regarde vers la gauche. */
  miroir?: boolean;
}

/** Bras (manche blanche, avant-bras, main) accroché à l'épaule, tourné de `angle`. */
const bras = (k: Pinceaux, x: number, angle: number, outil = '') =>
  groupe(
    `translate(${x} -176) rotate(${angle})`,
    [
      rect(-10, -4, 20, 42, 'white', undefined, 9),
      rect(-10, -4, 20, 42, k.p, 0.12, 9),
      rect(-7, 34, 14, 40, k.peau, undefined, 7),
      rond(0, 78, 9, k.peau),
      outil ? groupe('translate(0 80)', outil) : '',
    ].join(''),
  );

/** Artisan debout, pieds à l'origine (environ 250 de haut). */
function artisan(k: Pinceaux, x: number, y: number, e: number, pose: Pose = {}): string {
  const [g, d] = pose.bras ?? [8, 8];
  const corps = [
    // Chaussures et jambes (salopette).
    rect(-32, -14, 28, 14, k.s, undefined, 6),
    rect(4, -14, 28, 14, k.s, undefined, 6),
    rect(-28, -112, 25, 100, k.p, undefined, 6),
    rect(3, -112, 25, 100, k.p, undefined, 6),
    // Bras gauche derrière le corps.
    bras(k, -30, g),
    // Buste : t-shirt blanc, bavette, bretelles, ceinture.
    rect(-34, -192, 68, 92, 'white', undefined, 18),
    rect(-34, -192, 68, 92, k.p, 0.1, 18),
    rect(-25, -158, 50, 56, k.p, undefined, 6),
    ligne('M-20 -158 L-24 -186 M20 -158 L24 -186', k.p, 7),
    rect(-30, -116, 60, 16, k.p, undefined, 4),
    rect(-9, -146, 18, 14, 'white', 0.35, 3),
    // Cou, tête, cheveux, casquette.
    rect(-8, -204, 16, 16, k.peau, undefined, 5),
    rond(0, -226, 24, k.peau),
    pose.casquette
      ? forme('M-25 -232 q 2 -26 26 -26 q 24 0 25 26 Z M18 -236 h22 q 4 0 2 5 h-24Z', k.a)
      : forme('M-25 -228 q 0 -30 26 -30 q 26 0 25 28 q -10 -14 -28 -12 q -12 1 -23 14Z', k.cheveux),
    rond(-24, -224, 6, k.peau),
    // Bras droit devant, avec l'outil.
    bras(k, 30, -d, pose.outil),
  ].join('');
  const t = e * 1.15;
  return groupe(`translate(${x} ${y}) scale(${pose.miroir ? -t : t} ${t})`, corps);
}

/* ---------- Outils et objets ---------- */

// Outils tenus en main : dessinés dans le prolongement du bras (vers +y), main à l'origine.
const rouleau = (k: Pinceaux) =>
  [
    ligne('M0 -6 V110 H-30 V128', k.s, 6),
    rect(-74, 124, 88, 32, k.a, undefined, 13),
    rect(-74, 124, 88, 11, 'white', 0.35, 6),
  ].join('');
const cle = (k: Pinceaux) =>
  [
    rect(-5, -4, 10, 70, k.s, undefined, 4),
    forme('M-16 66 h32 v14 h-8 v-8 h-16 v8 h-8Z', k.s),
  ].join('');
const tournevis = (k: Pinceaux) =>
  [rect(-7, -8, 14, 36, k.a, undefined, 6), rect(-2, 26, 4, 32, k.s, undefined, 2)].join('');
const perceuse = (k: Pinceaux) =>
  [
    rect(-12, -12, 24, 40, k.s, undefined, 6),
    rect(-14, 22, 30, 70, k.a, undefined, 10),
    rect(-3, 90, 8, 26, k.s, undefined, 3),
  ].join('');
const truelle = (k: Pinceaux) =>
  [rect(-6, -6, 12, 34, k.a, undefined, 5), forme('M-6 26 l40 18 l-44 22 Z', k.s)].join('');
const pelle = (k: Pinceaux) =>
  [ligne('M0 -60 V110', k.s, 7), forme('M-20 110 h40 l-6 46 q -14 12 -28 0Z', k.s, 0.85)].join('');
const marteau = (k: Pinceaux) =>
  [rect(-5, -6, 10, 70, k.a, undefined, 4), rect(-24, 60, 48, 18, k.s, undefined, 4)].join('');

const echelle = (k: Pinceaux, x: number, y: number, h: number) =>
  [
    ligne(`M${x} ${y} L${x + 30} ${y - h} M${x + 80} ${y} L${x + 110} ${y - h}`, k.s, 8),
    ...Array.from({ length: Math.floor(h / 55) }, (_, i) => {
      const yy = y - 40 - i * 55;
      const dx = ((y - yy) / h) * 30;
      return ligne(`M${x + dx} ${yy} H${x + 80 + dx}`, k.s, 6);
    }),
  ].join('');

/** Gros pinceau en biais, la peinture vers le bas. */
const pinceau = (k: Pinceaux, x: number, y: number, angle: number, e = 1) =>
  groupe(
    `translate(${x} ${y}) rotate(${angle}) scale(${e})`,
    [
      rect(-16, -260, 32, 150, k.a, undefined, 14),
      rect(-30, -116, 60, 40, k.p, undefined, 6),
      forme('M-34 -78 h68 v70 q -34 22 -68 0Z', 'white'),
      forme('M-34 -40 h68 v32 q -34 22 -68 0Z', k.a),
    ].join(''),
  );

const ampoule = (k: Pinceaux, x: number, y: number) =>
  [
    ligne(`M${x} 0 V${y - 70}`, k.s, 4),
    rect(x - 16, y - 74, 32, 26, k.s, undefined, 4),
    rond(x, y, 64, k.a, 0.18),
    rond(x, y - 6, 42, 'white'),
    rond(x, y - 6, 42, k.a, 0.25),
    ligne(`M${x - 12} ${y - 10} q 12 -16 24 0`, k.a, 4),
  ].join('');

/** Maison en coupe : pignon, toit en débord, intérieur clair. */
const maison = (k: Pinceaux, x: number, l: number, h: number, toit: number) =>
  [
    forme(
      `M${x} ${SOL} V${SOL - h} L${x + l / 2} ${SOL - h - toit} L${x + l} ${SOL - h} V${SOL}Z`,
      k.a,
      0.16,
    ),
    ligne(
      `M${x - 30} ${SOL - h + 10} L${x + l / 2} ${SOL - h - toit} L${x + l + 30} ${SOL - h + 10}`,
      k.a,
      14,
      0.75,
    ),
  ].join('');

const carreaux = (k: Pinceaux, x: number, y: number, c: number, r: number, t = 46) =>
  Array.from({ length: r }, (_, j) =>
    Array.from({ length: c }, (_, i) =>
      (i + j) % 3 === 2
        ? ''
        : rect(x + i * (t + 4), y + j * (t + 4), t, t, k.a, (i * j) % 2 ? 0.28 : 0.18, 4),
    ).join(''),
  ).join('');

/* ---------- Scènes ---------- */

export const SCENES: Record<string, (k: Pinceaux) => string> = {
  renovation: (k) =>
    [
      fond(k),
      maison(k, 200, 800, 380, 210),
      forme('M200 700 V320 L300 250 V700Z', k.a, 0.85),
      ligne('M300 250 q 20 120 -6 240 q 18 110 0 210', k.a, 10, 0.7),
      ampoule(k, 600, 300),
      carreaux(k, 770, 420, 4, 5),
      echelle(k, 470, 700, 300),
      artisan(k, 270, 700, 1, { bras: [10, 160], outil: rouleau(k) }),
      artisan(k, 540, 520, 0.9, { bras: [150, 172], outil: tournevis(k), casquette: true }),
      pinceau(k, 690, 640, -28, 0.95),
      artisan(k, 870, 700, 1, { bras: [6, 120], outil: tournevis(k), miroir: true }),
      touffe(k, 120, 700, 1),
      touffe(k, 1090, 700, 0.9),
    ].join(''),
  'salle-de-bain': (k) =>
    [
      fond(k),
      maison(k, 180, 840, 400, 200),
      carreaux(k, 230, 330, 7, 7, 42),
      // Douche et baignoire.
      ligne('M560 300 V340 q 0 14 -20 14', k.s, 8),
      rect(520, 352, 40, 10, k.s, undefined, 5),
      forme('M640 560 H960 V590 q 0 80 -80 80 H720 q -80 0 -80 -80Z', 'white'),
      forme('M640 560 H960 V590 q 0 80 -80 80 H720 q -80 0 -80 -80Z', k.p, 0.18),
      ligne('M680 670 v28 M920 670 v28', k.s, 9),
      rect(900, 360, 90, 120, 'white', undefined, 45),
      rect(900, 360, 90, 120, k.p, 0.25, 45),
      artisan(k, 470, 700, 1.05, { bras: [10, 110], outil: cle(k), casquette: true }),
      touffe(k, 130, 700, 0.95),
      touffe(k, 1080, 700, 1),
    ].join(''),
  cuisine: (k) =>
    [
      fond(k),
      maison(k, 180, 840, 400, 200),
      rect(240, 330, 220, 110, k.p, 0.85, 8),
      rect(500, 330, 220, 110, k.p, 0.55, 8),
      ligne('M350 340 V430 M610 340 V430', 'white', 4, 0.6),
      rect(240, 520, 720, 22, k.s, 0.85, 4),
      rect(250, 542, 700, 158, k.p, 0.8, 6),
      ligne('M420 542 V700 M600 542 V700 M780 542 V700', 'white', 4, 0.5),
      forme('M790 520 q 0 -50 50 -50 q 50 0 50 50Z', k.a),
      ligne('M920 520 V470 q 0 -24 30 -24', k.s, 8),
      echelle(k, 760, 700, 240),
      artisan(k, 820, 470, 0.85, { bras: [140, 175], outil: perceuse(k), casquette: true }),
      artisan(k, 330, 700, 1, { bras: [20, -20] }),
      touffe(k, 120, 700, 0.9),
      touffe(k, 1090, 700, 0.95),
    ].join(''),
  toiture: (k) =>
    [
      fond(k, 1010),
      forme('M300 700 V430 H900 V700Z', k.a, 0.16),
      forme('M230 440 L600 200 L970 440Z', k.a, 0.85),
      ...Array.from({ length: 4 }, (_, i) => {
        const y = 270 + i * 44;
        const dx = ((y - 200) / 240) * 370;
        return ligne(`M${600 - dx} ${y} H${600 + dx}`, 'white', 4, 0.4);
      }),
      rect(700, 230, 54, 110, k.s, 0.85, 4),
      rect(400, 510, 120, 110, 'white', undefined, 6),
      rect(680, 510, 120, 110, 'white', undefined, 6),
      ligne('M460 510 V620 M400 565 H520 M740 510 V620 M680 565 H800', k.a, 5, 0.6),
      echelle(k, 930, 700, 330),
      artisan(k, 860, 420, 0.8, {
        bras: [150, 140],
        outil: marteau(k),
        casquette: true,
        miroir: true,
      }),
      artisan(k, 250, 700, 1, { bras: [20, 70], casquette: true }),
      rect(320, 620, 70, 30, k.a, 0.85, 4),
      touffe(k, 120, 700, 0.9),
      touffe(k, 1100, 700, 0.85),
    ].join(''),
  electricite: (k) =>
    [
      fond(k),
      maison(k, 200, 800, 380, 210),
      ampoule(k, 600, 330),
      ampoule(k, 420, 260),
      ampoule(k, 780, 260),
      rect(820, 440, 140, 180, k.s, 0.9, 10),
      ...Array.from({ length: 3 }, (_, r) =>
        Array.from({ length: 3 }, (_, i) =>
          rect(838 + i * 40, 462 + r * 52, 26, 38, 'white', 0.9, 4),
        ).join(''),
      ),
      ligne('M820 520 C 740 520 720 600 640 600', k.p, 6, 0.6),
      echelle(k, 470, 700, 280),
      artisan(k, 540, 540, 0.85, { bras: [165, 175], outil: tournevis(k), casquette: true }),
      artisan(k, 300, 700, 1, { bras: [10, 60] }),
      touffe(k, 120, 700, 0.95),
      touffe(k, 1090, 700, 0.9),
    ].join(''),
  peinture: (k) =>
    [
      fond(k),
      maison(k, 200, 800, 380, 210),
      forme('M200 700 V320 L560 320 q -30 80 0 160 q 30 100 0 220Z', k.a, 0.8),
      rect(300, 380, 150, 110, 'white', 0.9, 6),
      forme('M315 475 l50 -55 l35 35 l25 -25 l40 45Z', k.p, 0.8),
      pinceau(k, 760, 620, 24, 1),
      artisan(k, 620, 700, 1.05, { bras: [10, 165], outil: rouleau(k), casquette: true }),
      rect(880, 630, 90, 70, k.a, undefined, 10),
      rect(870, 620, 110, 16, k.s, undefined, 6),
      touffe(k, 120, 700, 0.95),
      touffe(k, 1090, 700, 1),
    ].join(''),
  menuiserie: (k) =>
    [
      fond(k),
      maison(k, 180, 840, 400, 200),
      rect(420, 340, 340, 300, k.s, 0.9, 8),
      rect(436, 356, 150, 268, k.p, 0.25),
      rect(594, 356, 150, 268, k.p, 0.25),
      ligne('M470 600 l60 -80 M640 600 l70 -100', 'white', 6, 0.5),
      rect(800, 420, 150, 280, k.a, 0.9, 6),
      rond(930, 560, 8, k.s),
      artisan(k, 360, 700, 1, { bras: [10, 130] }),
      artisan(k, 830, 700, 1, { bras: [10, 130], miroir: true, casquette: true }),
      rect(240, 660, 170, 18, k.a, undefined, 4),
      rect(260, 640, 150, 18, k.p, 0.8, 4),
      touffe(k, 120, 700, 0.9),
      touffe(k, 1090, 700, 0.95),
    ].join(''),
  chauffage: (k) =>
    [
      fond(k),
      maison(k, 180, 700, 380, 200),
      rect(280, 520, 300, 140, 'white', undefined, 12),
      ...Array.from({ length: 7 }, (_, i) => rect(296 + i * 40, 534, 26, 112, k.p, 0.8, 8)),
      ...Array.from({ length: 4 }, (_, i) =>
        ligne(`M${330 + i * 70} 500 q -14 -30 0 -60 q 14 -30 0 -60`, k.a, 7, 0.7),
      ),
      rect(900, 560, 200, 140, 'white', undefined, 12),
      rect(900, 560, 200, 140, k.p, 0.18, 12),
      rond(970, 630, 46, k.p, 0.85),
      ligne('M970 596 V664 M936 630 H1004', 'white', 6),
      ligne('M1040 600 H1080 M1040 630 H1080 M1040 660 H1080', k.s, 5, 0.5),
      artisan(k, 700, 700, 1.05, { bras: [10, 70], outil: cle(k), casquette: true }),
      touffe(k, 120, 700, 0.9),
    ].join(''),
  jardin: (k) =>
    [
      fond(k, 1000),
      forme('M0 560 C 260 480 560 540 820 500 S 1120 470 1200 500 V700 H0Z', k.p, 0.25),
      forme(`M760 ${SOL} V480 H1040 V${SOL}Z`, k.a, 0.16),
      ligne('M730 490 L900 390 L1070 490', k.a, 14, 0.75),
      rect(880, 600, 50, 100, k.a, 0.85, 4),
      ligne('M260 700 V520', k.s, 14),
      rond(260, 450, 100, k.p, 0.85),
      rond(190, 500, 64, k.p, 0.65),
      rond(330, 500, 70, k.p, 0.7),
      ...Array.from({ length: 9 }, (_, i) =>
        rect(430 + i * 34, 600, 18, 100, 'white', undefined, 4),
      ),
      rect(420, 630, 316, 10, 'white'),
      artisan(k, 560, 700, 1, { bras: [10, 30], outil: pelle(k), casquette: true }),
      touffe(k, 1110, 700, 1),
      touffe(k, 90, 700, 0.8),
    ].join(''),
  maconnerie: (k) =>
    [
      fond(k),
      ...Array.from({ length: 6 }, (_, r) =>
        Array.from({ length: 7 - (r > 3 ? r - 3 : 0) }, (_, i) =>
          rect(
            250 + i * 92 + (r % 2 ? 46 : 0),
            640 - r * 48,
            86,
            42,
            k.a,
            (i + r) % 3 ? 0.75 : 0.95,
            4,
          ),
        ).join(''),
      ),
      artisan(k, 900, 700, 1.05, {
        bras: [10, 110],
        outil: truelle(k),
        casquette: true,
        miroir: true,
      }),
      forme('M960 610 H1120 L1090 670 H990Z', k.p, 0.85),
      rond(1040, 685, 18, k.s),
      touffe(k, 140, 700, 1),
    ].join(''),
};
