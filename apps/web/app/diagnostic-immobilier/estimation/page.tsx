import { Logo } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ParcoursDiag } from '@/features/diagnostic/parcours/ParcoursDiag';
import { routes } from '@/lib/routes';
import { parcoursDiagnosticPublic } from '@/server/diagnostic';

export const metadata: Metadata = {
  title: 'Mes diagnostics obligatoires',
  description:
    'La liste exacte des diagnostics obligatoires pour vendre ou louer votre bien en Gironde, puis un budget pack. Gratuit, sans création de compte.',
  alternates: { canonical: '/diagnostic-immobilier/estimation' },
};

const conteneur = 'mx-auto w-full max-w-[1180px] px-[clamp(18px,4vw,44px)]';

/** Maquette Parcours Diagnostic : le bien, les rapports existants, le dossier, puis le budget. */
export default function PageParcoursDiag() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-trait bg-blanc">
        <div className={`${conteneur} flex min-h-14 flex-wrap items-center gap-x-5 gap-y-1 py-2`}>
          <Link
            href={routes.diagnostic}
            className="flex min-h-11 items-center text-texte no-underline"
          >
            <Logo taille={32} variant="diag" />
          </Link>
          <span className="hidden text-[15px] text-neutre-800 sm:inline">
            Dossier de diagnostics
          </span>
          <Link
            href={routes.aideSujet('diagnostic')}
            className="ml-auto inline-flex min-h-11 items-center text-sm text-neutre-800"
          >
            Besoin d&apos;aide ?
          </Link>
        </div>
      </header>
      <main className="flex-1 bg-accent-100 py-[clamp(24px,3.5vw,48px)]">
        <div className={conteneur}>
          <Suspense>
            <ParcoursDiag donnees={parcoursDiagnosticPublic()} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
