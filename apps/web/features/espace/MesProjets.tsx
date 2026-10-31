'use client';

import type { DemandeEspace } from '@ph/firebase/espace';
import { bouton } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { CarteDemande } from './CarteDemande';
import { DetailDemande } from './DetailDemande';

/** Onglet « Mes projets » : la liste, puis le détail de la demande choisie (la plus récente par défaut). */
export function MesProjets({
  demandes,
  demandeId,
}: {
  demandes: DemandeEspace[];
  demandeId?: string;
}) {
  const choisie = demandeId ?? demandes[0]?.id;
  if (!choisie)
    return (
      <div className="flex max-w-[640px] flex-col items-start gap-3.5 rounded-[16px] border border-dashed border-neutre-400 p-[clamp(28px,5vw,56px)]">
        <h2 className="m-0 text-2xl">Aucun projet pour l&apos;instant</h2>
        <p className="m-0 text-base leading-relaxed text-neutre-800">
          Estimez votre projet en 2 minutes et recevez jusqu&apos;à 3 devis d&apos;artisans vérifiés
          près de chez vous. Gratuit et sans engagement.
        </p>
        <Link href={routes.simulateur} className={bouton({ taille: 'lg' })}>
          Simuler mon devis
        </Link>
      </div>
    );
  return (
    <div className="grid items-start gap-5.5 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2.2fr)]">
      <nav aria-label="Mes demandes" className="flex flex-col gap-2.5">
        {demandes.map((d) => (
          <CarteDemande key={d.id} d={d} active={d.id === choisie} />
        ))}
      </nav>
      <DetailDemande key={choisie} demandeId={choisie} />
    </div>
  );
}
