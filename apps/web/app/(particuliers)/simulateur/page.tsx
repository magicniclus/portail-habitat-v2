import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Traceur } from '@/features/comportement/Traceur';
import { PageParcours } from '@/features/parcours/PageParcours';
import { Simulateur } from '@/features/simulateur/Simulateur';
import { lireCatalogueSimulateur } from '@/server/simulateur';

export const metadata: Metadata = {
  title: 'Simulateur de devis travaux',
  description:
    'Estimez le prix de vos travaux en 2 minutes : 112 types de travaux, prix constatés dans votre département. Gratuit et sans engagement.',
  alternates: { canonical: '/simulateur' },
};

/**
 * Maquette Simulateur de Devis : en-tête sobre (parcours), étapes, puis résultat.
 * Rendu par le serveur à chaque visite (lecture de `searchParams`) : l'étape demandée par l'adresse
 * est dans le HTML dès le premier affichage. En page statique, le simulateur (qui lit l'adresse)
 * n'apparaissait qu'une fois tout le JavaScript exécuté (≈ 3,3 s sur mobile, budget 2,5 s).
 * Aucune lecture en base : le coût serveur reste négligeable.
 */
export default async function PageSimulateur({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  return (
    <PageParcours titre="Simulateur de devis" mention="Gratuit · sans engagement">
      <Suspense>
        <Simulateur catalogue={lireCatalogueSimulateur()} />
      </Suspense>
      <Traceur page="simulateur" />
    </PageParcours>
  );
}
