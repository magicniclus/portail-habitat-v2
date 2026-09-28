import type { Metadata } from 'next';
import { LaisserAvis } from '@/features/avis/LaisserAvis';
import { PageParcours } from '@/features/parcours/PageParcours';

export const metadata: Metadata = {
  title: 'Laisser un avis sur un artisan',
  description:
    'Donnez votre avis sur l’artisan qui a réalisé vos travaux : chaque avis est vérifié avant publication.',
  alternates: { canonical: '/avis' },
};

/** Maquette Laisser un Avis : choix de l'artisan, avis, publication. */
export default function PageAvis() {
  return (
    <PageParcours titre="Laisser un avis">
      <LaisserAvis />
    </PageParcours>
  );
}
