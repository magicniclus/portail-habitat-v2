import localFont from 'next/font/local';
import type { CSSProperties } from 'react';

/**
 * Serif italique des grands titres (mot mis en avant), préchargée seulement sur les pages dont le
 * titre principal l'utilise (accueil, /pro, landings, parcours) : arrivée après l'affichage, elle
 * redessinait le titre (affichage du contenu principal retardé, décalage de 0,33 sur /pro ;
 * EXPLOITATION §1). Préchargée partout, elle retardait les autres pages. Même fichier que la police
 * du site (`app/layout.tsx`).
 */
const serifTitres = localFont({
  src: '../../app/polices/source-serif-4-latin-600-italic.woff2',
  weight: '600',
  style: 'italic',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});

/** À poser sur `<main>` : `--font-serif` est calculé à la racine, il est redéfini ici. */
export const styleSerifTitres = {
  '--font-serif': `${serifTitres.style.fontFamily}, Georgia, serif`,
} as CSSProperties;
