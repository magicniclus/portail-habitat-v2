import { actions, couleurs } from '@ph/ui/tokens';

/** Adresses de l'application pro installable (MOBILE §9). */
export const PWA_PRO = {
  manifest: '/pro/manifest.webmanifest',
  serviceWorker: '/pro/sw.js',
  portee: '/pro/',
  horsLigne: '/pro/hors-ligne',
  icone: (format: FormatIcone) => `/pro/icone/${format}`,
} as const;

export const FORMATS_ICONE = ['192', '512', 'maskable', 'apple'] as const;
export type FormatIcone = (typeof FORMATS_ICONE)[number];

/** Taille en pixels ; « maskable » garde le dessin dans la zone sûre (80 % au centre). */
export const TAILLES_ICONE: Record<FormatIcone, number> = {
  '192': 192,
  '512': 512,
  maskable: 512,
  apple: 180,
};

/** Manifest de l'espace pro : nom, icônes, affichage autonome, raccourcis. */
export function manifestPro() {
  return {
    id: '/pro/',
    name: 'Portail Habitat Pro',
    short_name: 'PH Pro',
    description: 'Vos demandes de travaux, votre fiche et vos avis, partout.',
    lang: 'fr',
    start_url: '/pro/tableau-de-bord',
    scope: PWA_PRO.portee,
    display: 'standalone',
    orientation: 'portrait',
    theme_color: actions.pro,
    background_color: couleurs.fond,
    icons: [
      { src: PWA_PRO.icone('192'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: PWA_PRO.icone('512'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: PWA_PRO.icone('maskable'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Mes demandes', url: '/pro/demandes' },
      { name: 'Tableau de bord', url: '/pro/tableau-de-bord' },
    ],
  };
}
