import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageLanding } from '@/features/landings/PageLanding';
import { flagActif } from '@/server/flags';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: 'Site internet artisan gratuit, créé avec l’IA · Portail Travaux Pro' },
  description:
    'Créez votre site internet d’artisan gratuitement : l’IA rédige vos pages, vous publiez sur votre adresse Portail Travaux. Sans carte bancaire.',
  alternates: { canonical: '/pro/site-internet-artisan' },
};

/** Ouverte avec le site artisan (flag `landingSite`) : on ne vante pas un outil pas encore livré. */
export default async function LandingSite() {
  if (!(await flagActif('landingSite'))) notFound();
  return <PageLanding outil="site" />;
}
