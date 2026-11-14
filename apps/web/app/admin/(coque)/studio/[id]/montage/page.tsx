import { LIBELLES_STATUT_STUDIO } from '@ph/core/studio';
import { appAdmin } from '@ph/firebase/admin';
import { friseDuProjet, listerProjetsStudio } from '@ph/firebase/studio';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { projetStudioPage } from '@/features/studio/projetPage';
import { StudioProjet } from '@/features/studio/StudioProjet';

export const metadata: Metadata = { title: 'Studio' };
/** Idées, retouche et montage par Claude : plusieurs minutes possibles. */
export const maxDuration = 300;

/**
 * Le Studio d'une vidéo (STUDIO.md §5 bis) : l'éditeur plein écran, où tout se fait. Le panneau
 * IA à gauche gère l'idée, le tournage, la voix et suit la fabrication par Claude ; le plan de
 * Claude arrive converti en pistes tant qu'on ne l'a pas retouché à la main.
 */
export default async function MontagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await projetStudioPage(id, 'montage');
  const projets = (await listerProjetsStudio(getFirestore(appAdmin()))).map((x) => ({
    id: x.id,
    titre: x.titre,
  }));
  const etat =
    p.statut === 'pret' || p.statut === 'enregistrement' || p.statut === 'sujet'
      ? null
      : p.statut === 'erreur'
        ? `À relancer : ${p.erreur ?? ''}`
        : `${LIBELLES_STATUT_STUDIO[p.statut]} en cours…`;
  return (
    <StudioProjet
      key={p.version}
      projetId={p.id}
      frise={friseDuProjet(p)}
      fichiers={{ prise: p.prise?.fichiers ?? {}, captures: p.captures }}
      mots={p.mots}
      etat={etat}
      projet={{
        statut: p.statut,
        priseId: p.prise?.id ?? null,
        depuis: p.updatedAt,
        erreur: p.erreur,
        sujets: p.sujets,
        choisi: p.sujet,
        theme: p.theme ?? '',
        retouche: Boolean(p.plan && p.prise),
        video: p.rendu?.video ?? null,
        style: p.style,
      }}
      filmage={p.statut === 'captures'}
      projets={projets}
    />
  );
}
