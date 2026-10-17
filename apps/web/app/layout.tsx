import type { Metadata, Viewport } from 'next';
import { Source_Sans_3, Source_Serif_4 } from 'next/font/google';
import type { ReactNode } from 'react';
import { BandeauCookies } from '@/features/cookies/BandeauCookies';
import { SCRIPT_BANDEAU_COOKIES } from '@/features/cookies/scriptBandeau';
import { AppCheck } from '@/features/firebase/AppCheck';
import { viewportEspace } from '@/features/theme/viewport';
import { URL_SITE } from '@/features/vitrine/seo';
import { routes } from '@/lib/routes';
import './globals.css';

// Sous-ensemble latin, display: swap (MOBILE.md §10). Source Sans 3 en police variable : un seul fichier
// pour les graisses 400 à 700 ; la serif italique ne sert qu'au mot mis en avant des titres.
const sans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--police-sans',
  display: 'swap',
});
const serif = Source_Serif_4({
  subsets: ['latin'],
  weight: '600',
  style: 'italic',
  variable: '--police-serif',
  display: 'swap',
  // Deux mots en italique par page : pas de préchargement, la bande passante va au texte principal.
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: { default: 'Portail Habitat', template: '%s · Portail Habitat' },
  description: 'Trouvez un artisan vérifié près de chez vous et simulez votre devis.',
};

export const viewport: Viewport = viewportEspace('particulier');

export default function RacineLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_BANDEAU_COOKIES }} />
      </head>
      <body>
        {children}
        <BandeauCookies politique={routes.legal('particuliers', 'cookies')} />
        <AppCheck />
      </body>
    </html>
  );
}
