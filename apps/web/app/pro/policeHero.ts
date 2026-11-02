import localFont from 'next/font/local';

/**
 * Serif italique du titre du hero, préchargée sur /pro seulement : arrivée après l'affichage, elle
 * changeait la hauteur du titre et décalait toute la page (CLS 0,33, budget 0,05 ; EXPLOITATION §1).
 * Même fichier que la police du site (`app/layout.tsx`), qui n'est préchargée nulle part ailleurs.
 */
export const serifHero = localFont({
  src: '../polices/source-serif-4-latin-600-italic.woff2',
  weight: '600',
  style: 'italic',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});
