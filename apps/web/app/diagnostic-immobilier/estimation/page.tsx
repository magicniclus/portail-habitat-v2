import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ParcoursDiag } from '@/features/diagnostic/parcours/ParcoursDiag';
import { PageParcours } from '@/features/parcours/PageParcours';
import { routes } from '@/lib/routes';
import { parcoursDiagnosticPublic } from '@/server/diagnostic';

export const metadata: Metadata = {
  title: 'Mes diagnostics obligatoires',
  description:
    'La liste exacte des diagnostics obligatoires pour vendre ou louer votre bien en Gironde, puis un budget pack. Gratuit, sans création de compte.',
  alternates: { canonical: '/diagnostic-immobilier/estimation' },
};

/** Maquette Parcours Diagnostic : le bien, les rapports existants, le dossier, puis le budget. */
export default function PageParcoursDiag() {
  return (
    <PageParcours
      titre="Dossier de diagnostics"
      accueil={routes.diagnostic}
      logo="diag"
      aide={routes.aideSujet('diagnostic')}
    >
      <Suspense>
        <ParcoursDiag donnees={parcoursDiagnosticPublic()} />
      </Suspense>
    </PageParcours>
  );
}
