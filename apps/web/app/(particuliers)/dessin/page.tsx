import type { Metadata } from 'next';
import { PageDessinPublic } from '@/features/dessin/public/PageDessinPublic';
import { exigerDessinPublic } from '@/server/pageDessin';

export const metadata: Metadata = {
  title: { absolute: 'Plan de maison gratuit en 2D et 3D · Portail Travaux' },
  description:
    'Dessinez gratuitement le plan de votre maison, voyez-le en 3D, puis demandez des devis avec votre plan. Sans inscription pour essayer.',
  alternates: { canonical: '/dessin' },
};

// Suit le flag `dessinPublic` sans délai tant que la page est fermée ; à l'ouverture,
// passer en `revalidate = 3600` comme les autres landings (COUTS : une lecture par visite).
export const dynamic = 'force-dynamic';

/** Page publique Plans (DES-03), ouverte avec le flag `dessinPublic`. */
export default async function PageDessin() {
  await exigerDessinPublic();
  return <PageDessinPublic />;
}
