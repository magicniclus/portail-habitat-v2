import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

/** Ancienne adresse (README) : la connexion est unique, `/connexion?espace=pro` (D40). */
export default function RedirectionConnexionPro() {
  redirect(routes.connexionPro);
}
