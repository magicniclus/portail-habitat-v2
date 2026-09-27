import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: { default: 'Portail Habitat', template: '%s · Portail Habitat' },
  description: 'Trouvez un artisan vérifié près de chez vous et simulez votre devis.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

// Lot 1b : polices (next/font), thèmes (data-theme) et layouts des 4 segments.
export default function RacineLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
