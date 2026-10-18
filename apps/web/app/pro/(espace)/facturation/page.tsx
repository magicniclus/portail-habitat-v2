import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

/** Ancienne adresse (emails déjà envoyés) : la facturation est dans Mon abonnement (PAIEMENTS §4). */
export default function PageFacturation() {
  redirect(routes.proAbonnement);
}
