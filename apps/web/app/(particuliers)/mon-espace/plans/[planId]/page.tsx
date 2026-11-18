import type { Metadata } from 'next';
import { Editeur } from '@/features/dessin/Editeur';
import { exigerDessin } from '@/server/pageDessin';

export const metadata: Metadata = { title: 'Dessin', robots: { index: false } };

export default async function PageEditeurParticulier({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  await exigerDessin();
  return <Editeur espace="particulier" planId={(await params).planId} />;
}
