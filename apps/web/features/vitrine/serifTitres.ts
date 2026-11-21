import localFont from 'next/font/local';
import type { CSSProperties } from 'react';

/**
 * Serif italique des grands titres (mot mis en avant) sur l'accueil, /pro, les landings et les
 * parcours. `display: optional`, sans préchargement : si elle n'est pas là au premier affichage, le
 * mot reste en Georgia (jamais redessiné, aucun décalage) et elle sert dès la page suivante. En
 * `swap` préchargée, elle prenait la bande passante du texte principal et le Lighthouse mobile
 * dépassait 2,5 s d'affichage du contenu principal (EXPLOITATION §1, 14/11/2026). Même fichier que
 * la police du site (`app/layout.tsx`).
 */
const serifTitres = localFont({
  src: '../../app/polices/source-serif-4-latin-600-italic.woff2',
  weight: '600',
  style: 'italic',
  display: 'optional',
  preload: false,
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});

/** À poser sur `<main>` : `--font-serif` est calculé à la racine, il est redéfini ici. */
export const styleSerifTitres = {
  '--font-serif': `${serifTitres.style.fontFamily}, Georgia, serif`,
} as CSSProperties;
