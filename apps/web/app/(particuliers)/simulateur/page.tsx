import { Logo } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Simulateur } from '@/features/simulateur/Simulateur';
import { routes } from '@/lib/routes';
import { lireCatalogueSimulateur } from '@/server/simulateur';

export const metadata: Metadata = {
  title: 'Simulateur de devis travaux',
  description:
    'Estimez le prix de vos travaux en 2 minutes : 112 types de travaux, prix constatés dans votre département. Gratuit et sans engagement.',
  alternates: { canonical: '/simulateur' },
};

const conteneur = 'mx-auto w-full max-w-[1180px] px-[clamp(18px,4vw,44px)]';

/** Maquette Simulateur de Devis : en-tête sobre (parcours), étapes, puis résultat. */
export default function PageSimulateur() {
  const catalogue = lireCatalogueSimulateur();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-trait bg-blanc">
        <div className={`${conteneur} flex min-h-14 flex-wrap items-center gap-x-5 gap-y-1 py-2`}>
          <Link
            href={routes.accueil}
            className="flex min-h-11 items-center text-texte no-underline"
          >
            <Logo taille={32} />
          </Link>
          <span className="hidden text-[15px] text-neutre-800 sm:inline">Simulateur de devis</span>
          <span className="ml-auto flex items-center gap-3.5 text-sm text-neutre-800">
            <span className="hidden items-center gap-2 sm:flex">
              <span aria-hidden="true" className="block size-[7px] rounded-pill bg-accent" />
              Gratuit · sans engagement
            </span>
            <Link href={routes.aide} className="inline-flex min-h-11 items-center text-neutre-800">
              Besoin d&apos;aide ?
            </Link>
          </span>
        </div>
      </header>
      <main className="flex-1 bg-accent-100 py-[clamp(24px,3.5vw,48px)] pb-[clamp(40px,5vw,72px)]">
        <div className={conteneur}>
          <Suspense>
            <Simulateur catalogue={catalogue} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
