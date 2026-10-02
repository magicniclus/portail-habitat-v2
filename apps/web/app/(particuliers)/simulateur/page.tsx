import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageParcours } from '@/features/parcours/PageParcours';
import { Simulateur } from '@/features/simulateur/Simulateur';
import { lireCatalogueSimulateur } from '@/server/simulateur';

export const metadata: Metadata = {
  title: 'Simulateur de devis travaux',
  description:
    'Estimez le prix de vos travaux en 2 minutes : 112 types de travaux, prix constatés dans votre département. Gratuit et sans engagement.',
  alternates: { canonical: '/simulateur' },
};

/** Maquette Simulateur de Devis : en-tête sobre (parcours), étapes, puis résultat. */
export default function PageSimulateur() {
  return (
    <PageParcours titre="Simulateur de devis" mention="Gratuit · sans engagement">
      <Suspense>
        <Simulateur catalogue={lireCatalogueSimulateur()} />
      </Suspense>
    </PageParcours>
  );
}
