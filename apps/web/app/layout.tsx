import type { Metadata, Viewport } from 'next';
import { Source_Sans_3, Source_Serif_4 } from 'next/font/google';
import type { ReactNode } from 'react';
import { viewportEspace } from '@/features/theme/viewport';
import './globals.css';

// Deux polices, sous-ensemble latin, display: swap (MOBILE.md §10).
const sans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
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
