import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RetourLien } from '@/features/connexion/RetourLien';
import { PageParcours } from '@/features/parcours/PageParcours';

export const metadata: Metadata = {
  title: 'Connexion à mon espace',
  robots: { index: false },
  // Le code du lien ne doit pas fuiter vers d'autres sites (en-tête Referer).
  referrer: 'no-referrer',
};

export default function PageRetourLien() {
  return (
    <PageParcours titre="Mon espace">
      <div className="mx-auto max-w-[520px] rounded-[18px] bg-blanc p-[clamp(22px,4vw,36px)] shadow-md">
        <Suspense>
          <RetourLien />
        </Suspense>
      </div>
    </PageParcours>
  );
}
