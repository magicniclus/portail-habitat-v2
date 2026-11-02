import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { BandeauCookies } from '@/features/cookies/BandeauCookies';
import { ScriptBandeau } from '@/features/cookies/ScriptBandeau';
import { AppCheck } from '@/features/firebase/AppCheck';
import { viewportEspace } from '@/features/theme/viewport';
import { URL_SITE } from '@/features/vitrine/seo';
import { routes } from '@/lib/routes';
import { FAVICONS } from '@/lib/favicon';
import './globals.css';

// Polices auto-hébergées (sous-ensemble latin, licence OFL) : aucun appel à Google Fonts, au build
// comme en développement (un poste sans accès à fonts.gstatic.com ne bloque plus `pnpm dev`).
// display: swap (MOBILE.md §10) ; Source Sans 3 variable : un seul fichier pour toutes les graisses ;
// la serif italique ne sert qu'au mot mis en avant des titres.
const sans = localFont({
  src: './polices/source-sans-3-latin-variable.woff2',
  weight: '200 900',
  style: 'normal',
  variable: '--police-sans',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
});
const serif = localFont({
  src: './polices/source-serif-4-latin-600-italic.woff2',
  weight: '600',
  style: 'italic',
  variable: '--police-serif',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  // Deux mots en italique par page : pas de préchargement, la bande passante va au texte principal
  // (préchargée seulement sur /pro, où elle décalait la page : `app/pro/page.tsx`).
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: { default: 'Portail Travaux', template: '%s · Portail Travaux' },
  description: 'Trouvez un artisan vérifié près de chez vous et simulez votre devis.',
  icons: { icon: FAVICONS },
};

export const viewport: Viewport = viewportEspace('particulier');

export default function RacineLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <ScriptBandeau />
      </head>
      <body>
        {children}
        <BandeauCookies politique={routes.legal('particuliers', 'cookies')} />
        <AppCheck />
      </body>
    </html>
  );
}
