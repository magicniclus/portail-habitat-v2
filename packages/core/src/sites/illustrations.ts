import { resoudreCouleur } from './couleurs';
import type { Theme } from './schemas';

/**
 * Illustrations des sites artisans (décision du 17/11/2026) : dessins vectoriels à plat, façon
 * « Canva », qui remplacent la photo quand l'artisan n'en a pas encore (grand bandeau, présentation,
 * réalisations). Elles sont dessinées avec les quatre couleurs de la palette du site : elles
 * changent avec elle. Une image d'illustration porte la mention « Photo d'illustration » sur le
 * site (jamais présentée comme un chantier de l'artisan).
 */
export const ILLUSTRATIONS = [
  'renovation',
  'salle-de-bain',
  'cuisine',
  'toiture',
  'electricite',
  'peinture',
  'menuiserie',
  'chauffage',
  'jardin',
  'maconnerie',
] as const;
export type Illustration = (typeof ILLUSTRATIONS)[number];

/** Préfixe des médias d'illustration (`ill:salle-de-bain`), à côté de `lib:` et `up:`. */
export const PREFIXE_ILLUSTRATION = 'ill:';
export const estIllustration = (src: string) => src.startsWith(PREFIXE_ILLUSTRATION);
const media = (i: Illustration) => `${PREFIXE_ILLUSTRATION}${i}` as const;

/** Ce que montre chaque illustration (texte alternatif). */
export const SUJETS: Record<Illustration, string> = {
  renovation: 'une maison en rénovation, échafaudage et échelle',
  'salle-de-bain': 'une salle de bain moderne, douche et baignoire',
  cuisine: 'une cuisine équipée avec îlot',
  toiture: 'une toiture en tuiles avec une échelle',
  electricite: 'un tableau électrique et des luminaires',
  peinture: 'un mur en cours de peinture, rouleau et escabeau',
  menuiserie: 'une grande fenêtre et une porte en bois',
  chauffage: 'un salon chauffé, radiateur et pompe à chaleur',
  jardin: 'un jardin paysager avec allée et clôture',
  maconnerie: 'un mur en briques, brouette et truelle',
};

/** Mots du métier → illustration principale, puis deux voisines pour les réalisations. */
const FAMILLES: [RegExp, Illustration, Illustration, Illustration][] = [
  [/plomb|sanitaire|salle de bain|douche/, 'salle-de-bain', 'cuisine', 'chauffage'],
  [/carrel|faïenc|faienc/, 'salle-de-bain', 'cuisine', 'renovation'],
  [/cuisin/, 'cuisine', 'menuiserie', 'salle-de-bain'],
  [/couv|toit|charpent|zingu|étanch|etanch/, 'toiture', 'renovation', 'maconnerie'],
  [/électr|electr|domoti|éclair|eclair/, 'electricite', 'chauffage', 'renovation'],
  [/peint|décor|decor|plaqu|plâtr|platr|tapiss|enduit/, 'peinture', 'renovation', 'menuiserie'],
  [
    /menuis|ébén|eben|fenêtr|fenetr|parquet|bois|vitr|serrur|stor/,
    'menuiserie',
    'peinture',
    'renovation',
  ],
  [
    /chauff|clim|pompe|chaudi|énerg|energ|ventil|poêl|poel|isol/,
    'chauffage',
    'electricite',
    'renovation',
  ],
  [
    /paysag|jardin|élag|elag|clôtur|clotur|piscin|espace vert/,
    'jardin',
    'maconnerie',
    'renovation',
  ],
  [
    /maçon|macon|terrass|béton|beton|façad|facad|gros œuvre|gros oeuvre|démol|demol/,
    'maconnerie',
    'renovation',
    'toiture',
  ],
];

/** Illustrations d'un métier : une pour le bandeau, trois pour la présentation et les réalisations. */
export function illustrationsDuMetier(metier: string): {
  bandeau: `ill:${Illustration}`;
  galerie: `ill:${Illustration}`[];
} {
  const m = metier.toLowerCase();
  const f = FAMILLES.find(([re]) => re.test(m));
  const [a, b, c] = f ? [f[1], f[2], f[3]] : (['renovation', 'peinture', 'menuiserie'] as const);
  return { bandeau: media(a), galerie: [media(a), media(b), media(c)] };
}

/** `ill:cuisine` → `cuisine` (ou `null` si ce n'est pas une illustration connue). */
export function illustrationDe(src: string): Illustration | null {
  const id = src.slice(PREFIXE_ILLUSTRATION.length);
  return estIllustration(src) && (ILLUSTRATIONS as readonly string[]).includes(id)
    ? (id as Illustration)
    : null;
}

type Palette = Theme['palette'];
interface Pinceaux {
  /** Principale, accent, fond clair, sombre (couleurs du site). */
  p: string;
  a: string;
  c: string;
  s: string;
}

const W = 1200;
const H = 800;
const rect = (x: number, y: number, w: number, h: number, f: string, o = '', rx = 0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"${o ? ` opacity="${o}"` : ''}/>`;
const cercle = (x: number, y: number, r: number, f: string, o = '') =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${o ? ` opacity="${o}"` : ''}/>`;
const chemin = (d: string, f: string, o = '') =>
  `<path d="${d}" fill="${f}"${o ? ` opacity="${o}"` : ''}/>`;
const trait = (d: string, s: string, w: number, o = '') =>
  `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o ? ` opacity="${o}"` : ''}/>`;

/** Fond commun : aplat clair, grandes formes douces, sol. */
function decor(k: Pinceaux, sol = true): string {
  return [
    rect(0, 0, W, H, k.c),
    cercle(1010, 170, 250, k.p, '.08'),
    cercle(150, 120, 180, k.a, '.10'),
    chemin('M0 560 C 260 500 520 620 820 560 S 1150 520 1200 540 V800 H0Z', k.p, '.10'),
    sol ? rect(0, 690, W, 110, k.s, '.10') : '',
  ].join('');
}

/** Plante en pot (petite touche de vie, utilisée dans plusieurs scènes). */
const plante = (k: Pinceaux, x: number, y: number) =>
  [
    chemin(`M${x - 34} ${y - 70} q -40 -70 10 -120 q 20 60 -10 120Z`, k.p, '.85'),
    chemin(`M${x + 30} ${y - 70} q 50 -60 10 -125 q -35 55 -10 125Z`, k.p, '.65'),
    chemin(`M${x} ${y - 70} q -8 -90 18 -150 q 22 80 -18 150Z`, k.p),
    chemin(`M${x - 40} ${y - 72} h80 l-12 72 h-56Z`, k.a),
  ].join('');

const SCENES: Record<Illustration, (k: Pinceaux) => string> = {
  renovation: (k) =>
    [
      decor(k),
      // Maison.
      chemin('M300 330 L560 150 L820 330Z', k.s),
      rect(330, 330, 460, 360, 'white'),
      rect(330, 330, 460, 24, k.p, '.25'),
      rect(400, 420, 110, 110, k.p, '.85', 6),
      rect(610, 420, 110, 110, k.p, '.85', 6),
      trait('M455 420 V530 M400 475 H510 M665 420 V530 M610 475 H720', 'white', 6),
      rect(520, 560, 80, 130, k.a, '', 6),
      // Échafaudage.
      trait('M840 260 V690 M960 260 V690 M840 360 H960 M840 470 H960 M840 580 H960', k.s, 10),
      trait('M840 360 L960 470 M960 470 L840 580', k.s, 6, '.6'),
      rect(830, 350, 140, 14, k.a),
      rect(830, 460, 140, 14, k.a),
      // Échelle et seau.
      trait('M230 690 L300 380 M280 690 L350 380', k.s, 9),
      trait('M245 625 H295 M260 560 H310 M275 495 H325 M290 430 H340', k.s, 7),
      rect(1010, 620, 90, 70, k.p, '', 8),
      trait('M1010 620 q 45 -60 90 0', k.s, 6),
      plante(k, 150, 690),
    ].join(''),
  'salle-de-bain': (k) =>
    [
      decor(k, false),
      // Mur carrelé.
      rect(120, 120, 960, 570, 'white'),
      ...Array.from({ length: 8 }, (_, i) => trait(`M120 ${190 + i * 70} H1080`, k.p, 2, '.18')),
      ...Array.from({ length: 13 }, (_, i) => trait(`M${190 + i * 70} 120 V690`, k.p, 2, '.18')),
      rect(0, 690, W, 110, k.s, '.12'),
      // Douche vitrée.
      rect(170, 170, 300, 520, k.p, '.12'),
      trait('M170 170 V690 M470 170 V690', k.s, 8),
      trait('M320 170 V230 q 0 20 -30 20', k.s, 10),
      rect(250, 250, 80, 16, k.s, '', 8),
      ...Array.from({ length: 5 }, (_, i) => trait(`M${262 + i * 14} 285 l -6 60`, k.p, 4, '.5')),
      // Baignoire.
      chemin('M560 520 H1000 V560 q 0 110 -110 110 H670 q -110 0 -110 -110Z', 'white'),
      trait('M560 520 H1000 V560 q 0 110 -110 110 H670 q -110 0 -110 -110Z', k.s, 8),
      trait('M610 670 v20 M950 670 v20', k.s, 10),
      trait('M960 520 V440 q 0 -30 -30 -30', k.s, 9),
      // Miroir et vasque.
      rect(640, 190, 220, 170, k.c, '', 85),
      trait(
        'M725 190 h50 a85 85 0 0 1 85 85 v0 a85 85 0 0 1 -85 85 h-50 a85 85 0 0 1 -85 -85 v0 a85 85 0 0 1 85 -85z',
        k.s,
        8,
      ),
      chemin('M690 250 q 40 -40 90 -14', 'white', '.8'),
      rect(900, 300, 120, 16, k.a, '', 8),
      plante(k, 1050, 690),
    ].join(''),
  cuisine: (k) =>
    [
      decor(k, false),
      rect(0, 690, W, 110, k.s, '.12'),
      // Meubles hauts et hotte.
      rect(140, 150, 280, 150, k.p, '', 10),
      rect(780, 150, 280, 150, k.p, '', 10),
      trait('M280 160 V290 M920 160 V290', 'white', 4, '.5'),
      chemin('M500 150 H700 L740 300 H460Z', k.s),
      // Crédence.
      rect(140, 320, 920, 140, 'white'),
      ...Array.from({ length: 12 }, (_, i) => trait(`M${140 + i * 80} 320 V460`, k.p, 2, '.15')),
      // Plan de travail et meubles bas.
      rect(120, 460, 960, 26, k.s),
      rect(140, 486, 920, 204, k.p, '.9'),
      trait('M370 486 V690 M600 486 V690 M830 486 V690', 'white', 4, '.5'),
      trait('M250 520 H300 M480 520 H530 M710 520 H760 M940 520 H990', 'white', 8),
      // Plaque, casserole, robinet.
      rect(520, 448, 160, 14, k.s, '.7', 4),
      chemin('M545 448 q 0 -60 60 -60 q 60 0 60 60Z', k.a),
      trait('M860 460 V390 q 0 -30 40 -30', k.s, 9),
      // Îlot et tabourets.
      rect(380, 600, 440, 30, k.a, '', 6),
      trait('M450 630 V720 M750 630 V720', k.s, 10),
      cercle(300, 660, 26, k.s),
      trait('M300 686 V760', k.s, 8),
      cercle(900, 660, 26, k.s),
      trait('M900 686 V760', k.s, 8),
    ].join(''),
  toiture: (k) =>
    [
      decor(k),
      cercle(980, 170, 70, k.a, '.9'),
      // Maison et toit en tuiles.
      rect(300, 420, 600, 270, 'white'),
      chemin('M220 430 L600 160 L980 430Z', k.p),
      ...Array.from({ length: 6 }, (_, i) => {
        const y = 210 + i * 40;
        const dx = ((y - 160) / 270) * 380;
        return trait(`M${600 - dx} ${y} H${600 + dx}`, 'white', 4, '.35');
      }),
      ...Array.from({ length: 9 }, (_, i) =>
        trait(`M${360 + i * 60} 430 q 30 -30 60 0`, 'white', 3, '.3'),
      ),
      rect(700, 190, 60, 120, k.s),
      rect(380, 500, 120, 110, k.p, '.85', 6),
      rect(700, 500, 120, 110, k.p, '.85', 6),
      rect(555, 560, 90, 130, k.a, '', 6),
      // Fenêtre de toit.
      rect(450, 300, 90, 70, 'white', '.9', 4),
      trait('M495 300 V370 M450 335 H540', k.p, 5),
      // Échelle.
      trait('M970 690 L860 360 M1020 690 L910 360', k.s, 9),
      trait('M955 640 H1005 M935 580 H985 M915 520 H965 M895 460 H945 M875 400 H925', k.s, 7),
      plante(k, 170, 690),
    ].join(''),
  electricite: (k) =>
    [
      decor(k, false),
      rect(0, 690, W, 110, k.s, '.12'),
      rect(120, 120, 960, 570, 'white'),
      // Suspensions.
      trait('M380 120 V230 M600 120 V280 M820 120 V230', k.s, 4),
      chemin('M330 230 h100 l-20 60 h-60z', k.p),
      chemin('M545 280 h110 l-25 65 h-60z', k.p),
      chemin('M770 230 h100 l-20 60 h-60z', k.p),
      cercle(380, 310, 34, k.a, '.9'),
      cercle(600, 365, 38, k.a, '.9'),
      cercle(820, 310, 34, k.a, '.9'),
      cercle(600, 365, 90, k.a, '.12'),
      // Tableau électrique.
      rect(200, 400, 260, 250, k.s, '', 14),
      ...Array.from({ length: 3 }, (_, r) =>
        Array.from({ length: 5 }, (_, i) =>
          rect(225 + i * 44, 430 + r * 70, 30, 50, 'white', '.9', 5),
        ).join(''),
      ),
      ...Array.from({ length: 5 }, (_, i) => rect(232 + i * 44, 440, 16, 14, k.a, '', 3)),
      // Prises et interrupteur.
      rect(560, 500, 90, 90, k.c, '', 12),
      cercle(588, 545, 8, k.s),
      cercle(622, 545, 8, k.s),
      rect(700, 500, 90, 90, k.c, '', 12),
      rect(733, 520, 24, 50, k.p, '', 6),
      // Câbles et éclair.
      trait('M460 470 C 520 470 520 545 560 545 M460 520 C 600 520 640 470 700 520', k.p, 6, '.6'),
      chemin('M900 420 l-50 110 h40 l-30 100 l90 -130 h-45 l35 -80z', k.a),
    ].join(''),
  peinture: (k) =>
    [
      decor(k, false),
      rect(0, 690, W, 110, k.s, '.12'),
      // Mur à moitié peint.
      rect(120, 120, 960, 570, 'white'),
      rect(120, 120, 560, 570, k.p, '.9'),
      chemin('M680 120 q 30 90 0 180 q -30 90 0 180 q 30 90 0 210 V690 H680 V120Z', k.p, '.9'),
      trait('M690 160 q 20 60 -4 120', k.p, 8, '.6'),
      // Tableau et cadre.
      rect(250, 220, 220, 150, 'white', '.9', 8),
      chemin('M270 350 l70 -80 l50 50 l40 -40 l60 70z', k.a, '.9'),
      // Rouleau sur perche.
      rect(760, 230, 200, 60, k.a, '', 30),
      trait('M860 290 V330 H800 V560', k.s, 10),
      // Escabeau.
      trait('M300 690 L380 420 L460 690 M330 600 H430 M350 520 H410', k.s, 10),
      rect(355, 410, 50, 16, k.s, '', 4),
      // Pot de peinture.
      rect(880, 600, 120, 90, k.a, '', 10),
      rect(870, 590, 140, 18, k.s, '', 6),
      trait('M880 600 q 60 -70 120 0', k.s, 6),
      chemin('M900 600 v30 q 10 10 20 0 v-30z', k.p),
      // Bâche.
      chemin('M120 690 q 280 -30 560 0 q 200 20 400 -10 V720 H120Z', k.c),
    ].join(''),
  menuiserie: (k) =>
    [
      decor(k),
      rect(120, 120, 960, 570, 'white'),
      // Grande fenêtre.
      rect(200, 180, 460, 400, k.s, '', 10),
      rect(220, 200, 205, 360, k.p, '.25'),
      rect(435, 200, 205, 360, k.p, '.25'),
      cercle(330, 300, 60, k.a, '.5'),
      chemin('M220 560 L330 430 L425 560Z', k.p, '.6'),
      chemin('M435 560 L560 400 L640 560Z', k.p, '.45'),
      rect(180, 580, 500, 22, k.s, '', 4),
      // Porte en bois.
      rect(760, 220, 220, 470, k.a, '', 8),
      ...Array.from({ length: 4 }, (_, i) => trait(`M${800 + i * 45} 240 V670`, k.s, 3, '.25')),
      rect(785, 250, 170, 150, 'white', '.25', 6),
      cercle(940, 470, 12, k.s),
      // Planches et scie.
      rect(120, 640, 360, 26, k.p, '', 4),
      rect(150, 612, 320, 26, k.a, '', 4),
      chemin('M520 690 l90 -60 h110 l-20 30 h-90 l-60 40z', k.s, '.8'),
      plante(k, 1040, 690),
    ].join(''),
  chauffage: (k) =>
    [
      decor(k, false),
      rect(0, 690, W, 110, k.s, '.12'),
      rect(120, 120, 960, 570, 'white'),
      // Radiateur.
      rect(180, 450, 380, 190, k.c, '', 14),
      ...Array.from({ length: 8 }, (_, i) => rect(200 + i * 44, 465, 30, 160, k.p, '.85', 8)),
      trait(
        'M240 420 q -20 -40 0 -80 q 20 -40 0 -80 M330 420 q -20 -40 0 -80 q 20 -40 0 -80 M420 420 q -20 -40 0 -80 q 20 -40 0 -80 M510 420 q -20 -40 0 -80 q 20 -40 0 -80',
        k.a,
        8,
        '.7',
      ),
      // Thermostat.
      rect(640, 300, 120, 160, k.s, '', 18),
      cercle(700, 370, 40, k.a),
      cercle(700, 370, 24, k.s),
      rect(670, 425, 60, 10, 'white', '.6', 4),
      // Pompe à chaleur (fenêtre sur l'extérieur).
      rect(820, 200, 220, 260, k.p, '.18', 10),
      rect(840, 330, 180, 120, 'white', '', 10),
      cercle(900, 390, 42, k.c),
      cercle(900, 390, 30, k.p, '.85'),
      trait('M900 360 V420 M870 390 H930', 'white', 5),
      trait('M960 360 H1000 M960 385 H1000 M960 410 H1000', k.s, 5, '.4'),
      // Fauteuil.
      rect(640, 560, 300, 90, k.a, '', 26),
      rect(660, 500, 260, 80, k.a, '.85', 26),
      trait('M670 650 v40 M910 650 v40', k.s, 10),
    ].join(''),
  jardin: (k) =>
    [
      rect(0, 0, W, H, k.c),
      cercle(980, 160, 80, k.a, '.9'),
      cercle(220, 130, 120, 'white', '.6'),
      cercle(330, 150, 90, 'white', '.6'),
      // Collines et pelouse.
      chemin('M0 470 C 250 380 500 430 700 400 S 1050 360 1200 420 V800 H0Z', k.p, '.35'),
      chemin('M0 540 C 300 470 650 560 900 500 S 1150 480 1200 500 V800 H0Z', k.p, '.7'),
      // Maison au fond.
      rect(820, 360, 220, 160, 'white'),
      chemin('M800 365 L930 280 L1060 365Z', k.s),
      rect(905, 440, 50, 80, k.a, '', 4),
      // Allée.
      chemin('M560 800 C 600 680 760 600 900 520 L940 520 C 820 610 720 690 700 800Z', k.c),
      // Arbres.
      trait('M250 640 V520', k.s, 16),
      cercle(250, 470, 90, k.p),
      cercle(190, 510, 60, k.p, '.85'),
      cercle(310, 510, 64, k.p, '.85'),
      trait('M470 600 V520', k.s, 12),
      cercle(470, 480, 58, k.p, '.9'),
      // Clôture.
      ...Array.from({ length: 11 }, (_, i) => rect(40 + i * 46, 640, 22, 110, 'white', '', 4)),
      rect(30, 670, 520, 14, 'white'),
      rect(30, 720, 520, 14, 'white'),
      // Haie et fleurs.
      cercle(700, 720, 60, k.p, '.9'),
      cercle(780, 740, 50, k.p),
      cercle(690, 700, 10, k.a),
      cercle(760, 720, 10, k.a),
      cercle(800, 700, 10, k.a),
      cercle(1100, 700, 70, k.p),
      cercle(1080, 670, 10, k.a),
    ].join(''),
  maconnerie: (k) =>
    [
      decor(k),
      // Mur de briques.
      ...Array.from({ length: 8 }, (_, r) =>
        Array.from({ length: 8 }, (_, i) =>
          rect(
            140 + i * 110 + (r % 2 ? 55 : 0),
            200 + r * 56,
            100,
            46,
            r % 3 === 0 && i % 3 === 1 ? k.a : k.p,
            r % 2 ? '.8' : '.95',
            4,
          ),
        ).join(''),
      ),
      rect(120, 190, 960, 12, k.s, '.4'),
      // Brouette.
      chemin('M760 600 H1000 L960 680 H800Z', k.a),
      cercle(880, 700, 34, k.s),
      cercle(880, 700, 12, 'white'),
      trait('M760 600 L700 560 M1000 600 L1060 650', k.s, 10),
      // Truelle et niveau.
      chemin('M300 690 l120 -30 l30 30 l-120 30z', k.s, '.85'),
      trait('M440 670 l40 -40', k.s, 10),
      rect(160, 640, 200, 30, k.a, '', 6),
      cercle(260, 655, 8, 'white'),
      // Parpaings empilés.
      rect(500, 620, 150, 70, 'white', '', 6),
      rect(520, 560, 150, 60, 'white', '.9', 6),
      trait('M550 630 V680 M600 630 V680', k.p, 6, '.3'),
    ].join(''),
};

/** SVG complet d'une illustration aux couleurs de la palette. */
export function svgIllustration(i: Illustration, palette: Palette): string {
  // Couleurs sûres (jetons résolus, rien d'autre que #hex, rgb() ou hsl() n'entre dans le dessin).
  const c = (v: Theme['palette']['primaire'], defaut: string) =>
    (resoudreCouleur(v, palette) ?? defaut).replace(/[^#\w(),.% ]/g, '');
  const k: Pinceaux = {
    p: c(palette.primaire, 'gray'),
    a: c(palette.accent, 'gray'),
    c: c(palette.clair, 'white'),
    s: c(palette.sombre, 'black'),
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${SCENES[i](k)}</svg>`;
}

/** Adresse `data:` de l'illustration, prête pour `<img src>` ou un fond CSS. */
export const urlIllustration = (i: Illustration, palette: Palette) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgIllustration(i, palette))}`;
