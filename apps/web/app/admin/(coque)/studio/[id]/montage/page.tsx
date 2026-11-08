import { LIBELLES_STATUT_STUDIO } from '@ph/core/studio';
import { appAdmin } from '@ph/firebase/admin';
import { friseDuProjet, listerProjetsStudio } from '@ph/firebase/studio';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EtapeMontage } from '@/features/studio/EtapeMontage';
import { projetStudioPage } from '@/features/studio/projetPage';
import { SuiviTravail } from '@/features/studio/SuiviTravail';

export const metadata: Metadata = { title: 'Studio · montage' };
/** Retouche par Claude et relance du montage : plusieurs minutes possibles. */
export const maxDuration = 300;

/**
 * Étape Montage : suivi de la fabrication, puis l'éditeur multipistes (montage libre, ou plan de
 * Claude converti en pistes tant qu'on ne l'a pas retouché à la main).
 */
export default async function MontagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await projetStudioPage(id, 'montage');
  if (!p.libre && !p.prise) notFound();
  const projets = (await listerProjetsStudio(getFirestore(appAdmin())))
    .filter((x) => x.libre || x.plan)
    .map((x) => ({ id: x.id, titre: x.titre }));
  const etat =
    p.statut === 'pret' || p.statut === 'enregistrement'
      ? null
      : p.statut === 'erreur'
        ? `À relancer : ${p.erreur ?? ''}`
        : `${LIBELLES_STATUT_STUDIO[p.statut]} en cours…`;
  return (
    <div className="grid gap-4">
      {p.prise ? (
        <SuiviTravail
          projetId={p.id}
          priseId={p.prise.id}
          statut={p.statut}
          depuis={p.updatedAt}
          erreur={p.erreur}
        />
      ) : null}
      {p.libre || p.plan ? (
        <EtapeMontage
          key={p.version}
          projetId={p.id}
          frise={friseDuProjet(p)}
          fichiers={{ prise: p.prise?.fichiers ?? {}, captures: p.captures }}
          mots={p.mots}
          retouche={Boolean(p.plan && p.prise)}
          etat={etat}
          projets={projets}
        />
      ) : null}
    </div>
  );
}
