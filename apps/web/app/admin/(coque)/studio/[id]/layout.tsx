import { etapeProjet, etapesAccessibles, LIBELLES_STATUT_STUDIO } from '@ph/core/studio';
import { formatEuros } from '@ph/core/format';
import { Badge } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { EcouteProjet } from '@/features/studio/EcouteProjet';
import { EtapesProjet } from '@/features/studio/EtapesProjet';
import { etatEtapes, projetStudioPage } from '@/features/studio/projetPage';
import { TONS_STATUT } from '@/features/studio/tons';

/** En-tête commun aux pages d'un projet Studio : titre, état, coût, barre d'étapes. */
export default async function LayoutProjetStudio({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = await params;
  const p = await projetStudioPage(id);
  const etat = etatEtapes(p);
  return (
    <main className="grid min-w-0 content-start gap-4 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <EcouteProjet statut={p.statut} />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link href={'/admin/studio' as Route} className="text-sm">
            ← Toutes les vidéos
          </Link>
          <h1 className="m-0 mt-1 text-[clamp(24px,3vw,30px)]">{p.titre}</h1>
        </div>
        <p className="m-0 flex items-center gap-2 text-sm text-neutre-700">
          <Badge tone={TONS_STATUT[p.statut]}>{LIBELLES_STATUT_STUDIO[p.statut]}</Badge>
          {formatEuros(p.coutCentimes, { decimales: 'toujours' })} de Claude
        </p>
      </header>
      <EtapesProjet
        projetId={p.id}
        accessibles={etapesAccessibles(etat)}
        enCours={etapeProjet(etat)}
      />
      {children}
    </main>
  );
}
