/**
 * Icône d'onglet de la plateforme : SVG (maison du logo), et `favicon.ico` pour les navigateurs
 * qui le demandent. À répéter dans toute mise en page qui déclare ses propres `icons` : Next.js
 * remplace la clé entière.
 */
export const FAVICONS = [
  { url: '/favicon.svg', type: 'image/svg+xml' },
  { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
];
