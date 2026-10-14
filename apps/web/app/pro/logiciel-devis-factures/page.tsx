import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageLanding } from '@/features/landings/PageLanding';
import { flagActif } from '@/server/flags';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: 'Logiciel de devis et factures gratuit pour artisans · Portail Habitat Pro' },
  description:
    'Devis et factures du bâtiment avec mentions obligatoires vérifiées, PDF à votre logo et signature en ligne. Gratuit, sans limite.',
  alternates: { canonical: '/pro/logiciel-devis-factures' },
};

/** Ouverte avec le module devis et factures (flag `landingDevis`, lot 11b). */
export default async function LandingDevis() {
  if (!(await flagActif('landingDevis'))) notFound();
  return <PageLanding outil="devis" />;
}
