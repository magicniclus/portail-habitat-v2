import { resoudreCouleur } from './couleurs';
import { HAUTEUR, LARGEUR, SCENES, type Pinceaux } from './illustrationsDessins';
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
  renovation: 'des artisans rénovent une maison (peinture, éclairage, carrelage)',
  'salle-de-bain': 'un plombier installe une salle de bain',
  cuisine: 'des artisans posent une cuisine',
  toiture: 'un couvreur sur le toit d’une maison',
  electricite: 'un électricien installe des luminaires',
  peinture: 'un peintre repeint un mur au rouleau',
  menuiserie: 'des menuisiers posent une grande fenêtre',
  chauffage: 'un chauffagiste près d’un radiateur et d’une pompe à chaleur',
  jardin: 'un paysagiste dans un jardin',
  maconnerie: 'un maçon monte un mur de briques',
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
/** Teintes des personnages (peau, cheveux), fournies par les tokens de `@ph/ui`. */
export interface TeintesIllustration {
  peau: string;
  cheveux: string;
}

/** Couleur `#rrggbb` assez colorée pour un feuillage (un gris ou un noir ne l'est pas). */
const saturee = (hex: string) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return true;
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(...v);
  return max > 0 && (max - Math.min(...v)) / max > 0.25;
};

/** SVG complet d'une illustration aux couleurs de la palette. */
export function svgIllustration(i: Illustration, palette: Palette, t: TeintesIllustration): string {
  // Couleurs sûres (jetons résolus, rien d'autre que #hex, rgb() ou hsl() n'entre dans le dessin).
  const sur = (v: string) => v.replace(/[^#\w(),.% ]/g, '');
  const c = (v: Palette['primaire'], defaut: string) => sur(resoudreCouleur(v, palette) ?? defaut);
  const k: Pinceaux = {
    p: c(palette.primaire, 'gray'),
    f: saturee(c(palette.primaire, 'gray'))
      ? c(palette.primaire, 'gray')
      : c(palette.accent, 'gray'),
    a: c(palette.accent, 'gray'),
    c: c(palette.clair, 'white'),
    s: c(palette.sombre, 'black'),
    peau: sur(t.peau),
    cheveux: sur(t.cheveux),
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} ${HAUTEUR}" preserveAspectRatio="xMidYMid slice">${SCENES[i]!(k)}</svg>`;
}

/** Adresse `data:` de l'illustration, prête pour `<img src>` ou un fond CSS. */
export const urlIllustration = (i: Illustration, palette: Palette, t: TeintesIllustration) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgIllustration(i, palette, t))}`;
