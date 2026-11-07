import type { Metadata } from 'next';
import Link from 'next/link';
import { bouton } from '@ph/ui';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Accès refusé', robots: { index: false } };

/** 403 (`forbidden()`) : section admin hors des permissions du membre (ADM-01). */
export default function Interdit() {
  return (
    <main className="mx-auto grid max-w-xl gap-4 px-4 py-16">
      <p className="m-0 text-sm font-semibold text-neutre-700">Erreur 403</p>
      <h1 className="m-0 text-[28px] leading-tight">Accès refusé</h1>
      <p className="m-0 text-base text-neutre-800">
        Votre rôle ne donne pas accès à cette section. Demandez la permission à un
        super-administrateur si vous en avez besoin.
      </p>
      <Link href={routes.admin} className={bouton({ variant: 'secondaire' })}>
        Retour au tableau de bord
      </Link>
    </main>
  );
}
