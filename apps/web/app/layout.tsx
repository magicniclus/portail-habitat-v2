import type { Metadata, Viewport } from 'next';
import { Source_Sans_3, Source_Serif_4 } from 'next/font/google';
import type { ReactNode } from 'react';
import { viewportEspace } from '@/features/theme/viewport';
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
});

export const metadata: Metadata = {
  title: { default: 'Portail Habitat', template: '%s · Portail Habitat' },
  description: 'Trouvez un artisan vérifié près de chez vous et simulez votre devis.',
};

export const viewport: Viewport = viewportEspace('particulier');

export default function RacineLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
