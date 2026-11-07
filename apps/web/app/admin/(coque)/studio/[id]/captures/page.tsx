import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EtapeCaptures } from '@/features/studio/EtapeCaptures';
import { projetStudioPage } from '@/features/studio/projetPage';

export const metadata: Metadata = { title: 'Studio · captures' };
/** Préparer les captures : un appel à Claude (moins d'une minute). */
export const maxDuration = 300;

export default async function CapturesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await projetStudioPage(id, 'captures');
  if (p.statut === 'sujet') notFound();
  return (
    <EtapeCaptures
      projetId={p.id}
      preparation={p.preparation}
      captures={p.captures}
      statut={p.statut}
      erreur={p.erreur}
      aScript={Boolean(p.sujet?.script.length)}
    />
  );
}
