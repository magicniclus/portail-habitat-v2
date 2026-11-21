import type { Metadata } from 'next';
import { PageLanding } from '@/features/landings/PageLanding';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: 'Trouver des chantiers gratuitement · Portail Travaux Pro' },
  description:
    'Les demandes de travaux des particuliers de votre secteur, réservées aux membres du réseau. Inscription gratuite, 0 % de commission.',
  alternates: { canonical: '/pro/trouver-des-chantiers' },
};

export default function LandingChantiers() {
  return <PageLanding outil="chantiers" />;
}
