/**
 * Source unique des couleurs, rayons, ombres et polices (site ET emails).
 * Toute couleur hexadécimale du projet vit ici : le lint l'interdit ailleurs.
 * Après modification : `pnpm --filter @ph/ui tokens` régénère les CSS.
 */

export type Palier = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type Rampe = { base: string } & Record<Palier, string>;

export const THEMES = ['particulier', 'pro', 'diag', 'admin'] as const;
export type Theme = (typeof THEMES)[number];

/** Rampes 100 → 900 de chaque espace (README « Design tokens », maquettes). */
export const rampes: Record<Theme, Rampe> = {
  particulier: {
    base: '#0d7a5f',
    100: '#eef7f3',
    200: '#d2ebe1',
    300: '#a5d7c4',
    400: '#5cbb9c',
    500: '#12997a',
    600: '#0a6650',
    700: '#085340',
    800: '#06402f',
    900: '#0a2a21',
  },
  pro: {
    base: '#e05a10',
    100: '#fff2ea',
    200: '#ffe0cd',
    300: '#ffc19c',
    400: '#ff9857',
    500: '#f2701f',
    600: '#c94f0a',
    700: '#a33f05',
    800: '#7a2f04',
    900: '#2a1a12',
  },
  diag: {
    base: '#14508a',
    100: '#eef4fa',
    200: '#d2e2f1',
    300: '#a4c5e3',
    400: '#5b96cc',
    500: '#1b64ad',
    600: '#10467a',
    700: '#0d3a65',
    800: '#0a2e50',
    900: '#081f37',
  },
  // Ardoise de l'admin (maquette Admin Portail Habitat) ; 800 et 900 prolongent la rampe.
  admin: {
    base: '#3f4a57',
    100: '#eef0f3',
    200: '#e6e9ed',
    300: '#c3c9d1',
    400: '#aab3be',
    500: '#4a5561',
    600: '#343e49',
    700: '#2a323c',
    800: '#1f262e',
    900: '#161b21',
  },
};

/**
 * Fond des boutons principaux (texte blanc) : contraste AA ≥ 4,5 (DECISIONS D45).
 * L'orange pro de marque (#e05a10) n'atteint que 3,7 : les boutons pro prennent le palier 600.
 */
export const actions: Record<Theme, string> = {
  particulier: rampes.particulier.base,
  pro: rampes.pro[600],
  diag: rampes.diag.base,
  admin: rampes.admin.base,
};

/** Libellés des espaces (wordmark du logo). */
export const suffixesLogo: Record<Theme, string> = {
  particulier: '',
  pro: 'PRO',
  diag: 'DIAG',
  admin: 'ADMIN',
};

/** Neutres et ombres issus du système Broadsheet (docs/designs/_ds). */
export const neutres = {
  100: '#f8f4f4',
  200: '#eae7e7',
  300: '#d7d3d3',
  400: '#bab6b6',
  500: '#9b9797',
  600: '#7d7979',
  700: '#605d5d',
  800: '#444141',
  900: '#2d2b2b',
} satisfies Record<Palier, string>;

export const couleurs = {
  texte: '#201e1d',
  fond: '#ffffff',
  surface: '#f6f6f4',
  blanc: '#ffffff',
  /** Or Premium : bordures et icônes ; `premiumTexte` pour le texte (AA). */
  premium: '#b8862b',
  premiumTexte: '#8a6420',
  premiumFond: '#fdf6e7',
  etoile: '#e8a33d',
  succes: '#0d7a5f',
  succesFond: '#eef7f3',
  /** Texte ambre (AA sur son fond) ; `attentionVif` pour les icônes et bordures. */
  attention: '#7a5206',
  attentionVif: '#a9700a',
  attentionFond: '#fdf4e3',
  danger: '#b42318',
  dangerFond: '#fef3f2',
  info: '#14508a',
  infoFond: '#eef4fa',
} as const;

/** Trait de séparation : texte à 16 % d'opacité. */
export const trait = `color-mix(in srgb, ${couleurs.texte} 16%, transparent)`;

export const ombres = {
  sm: `0 1px 2px color-mix(in srgb, ${neutres[900]} 14%, transparent)`,
  md: `0 3px 10px color-mix(in srgb, ${neutres[900]} 16%, transparent)`,
  lg: `0 12px 32px color-mix(in srgb, ${neutres[900]} 22%, transparent)`,
} as const;

/** Rayons en px : contrôles 10, cartes 14, panneaux 18, pastilles 999. */
export const rayons = { control: 10, card: 14, panel: 18, pill: 999 } as const;

export const polices = {
  sans: '"Source Sans 3", system-ui, sans-serif',
  serif: '"Source Serif 4", Georgia, serif',
} as const;

/** Points de rupture (MOBILE.md §2), en px. */
export const pointsDeRupture = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;
