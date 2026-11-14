import { appAdmin } from '@ph/firebase/admin';
import { listerIdeesStudio } from '@ph/firebase/studio';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { EtapeSujets } from '@/features/studio/EtapeSujets';
import { projetStudioPage } from '@/features/studio/projetPage';

export const metadata: Metadata = { title: 'Studio · idée et script' };
/** Proposer des idées : un appel à Claude peut durer plusieurs minutes. */
export const maxDuration = 300;

export default async function IdeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const analyse = (await searchParams).analyse === '1';
  const [p, idees] = await Promise.all([
    projetStudioPage(id, 'idees'),
    listerIdeesStudio(getFirestore(appAdmin())),
  ]);
  return (
    <EtapeSujets
      projetId={p.id}
      sujets={p.sujets}
      choisi={p.sujet}
      themeInitial={p.theme ?? ''}
      auto={analyse && p.statut === 'sujet'}
      tendances={p.tendances}
      reels={p.reels}
      titresGardes={idees.map((i) => i.sujet.titre.trim().toLowerCase())}
    />
  );
}
