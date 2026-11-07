import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EtapeEnregistrement } from '@/features/studio/EtapeEnregistrement';
import { projetStudioPage } from '@/features/studio/projetPage';

export const metadata: Metadata = { title: 'Studio · tournage' };
/** Voix IA et « Claude fait tout » lancent le montage par Claude. */
export const maxDuration = 300;

export default async function TournagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await projetStudioPage(id, 'tournage');
  if (p.statut === 'sujet') notFound();
  return (
    <EtapeEnregistrement
      projetId={p.id}
      script={p.sujet?.script ?? []}
      dureeCibleS={p.sujet?.dureeCibleS ?? 30}
      dejaEnregistre={Boolean(p.prise)}
    />
  );
}
