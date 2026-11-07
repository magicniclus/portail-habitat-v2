import { COOKIE_SESSION } from '@ph/firebase/serveur';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { BandeauAnnonces } from '@/features/annonces/BandeauAnnonces';
import { EnteteEspace } from '@/features/espace/EnteteEspace';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Mon espace', robots: { index: false } };

/**
 * Espace particulier : sans cookie de session, retour immédiat à la connexion. La validité du
 * cookie (révocation, expiration) est vérifiée par chaque route `/api/mon-espace/*`.
 */
export default async function LayoutEspace({ children }: { children: ReactNode }) {
  if (!(await cookies()).has(COOKIE_SESSION)) redirect(routes.connexionSuite(routes.monEspace));
  return (
    <div className="flex min-h-dvh flex-col bg-blanc">
      <EnteteEspace />
      <BandeauAnnonces public_="particuliers" />
      {children}
    </div>
  );
}
