import { LIBELLES_STATUT_STUDIO } from '@ph/core/studio';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EtapeMontage } from '@/features/studio/EtapeMontage';
import { EtapeMontageLibre } from '@/features/studio/EtapeMontageLibre';
import { projetStudioPage } from '@/features/studio/projetPage';
import { SuiviTravail } from '@/features/studio/SuiviTravail';

export const metadata: Metadata = { title: 'Studio · montage' };
/** Retouche par Claude et relance du montage : plusieurs minutes possibles. */
export const maxDuration = 300;

export default async function MontagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await projetStudioPage(id, 'montage');
  if (p.libre && p.frise)
    return (
      <EtapeMontageLibre
        projetId={p.id}
        frise={p.frise}
        fichiers={{ prise: p.prise?.fichiers ?? {}, captures: p.captures }}
        etat={p.erreur ? `À corriger : ${p.erreur}` : null}
      />
    );
  if (!p.prise) notFound();
  return (
    <div className="grid gap-4">
      <SuiviTravail
        projetId={p.id}
        priseId={p.prise.id}
        statut={p.statut}
        depuis={p.updatedAt}
        erreur={p.erreur}
      />
      {p.plan ? (
        <EtapeMontage
          projetId={p.id}
          plan={p.plan}
          prise={p.prise.fichiers}
          captures={p.captures}
          mots={p.mots}
          camera={p.camera}
          dureePriseMs={p.prise.dureeMs}
          version={p.version}
          etat={
            p.statut === 'pret'
              ? null
              : p.statut === 'erreur'
                ? `À relancer : ${p.erreur ?? ''}`
                : `${LIBELLES_STATUT_STUDIO[p.statut]} en cours…`
          }
        />
      ) : null}
    </div>
  );
}
