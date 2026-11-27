import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { projetStudioPage } from '@/features/studio/projetPage';

/** Ouvrir une vidéo : on arrive directement dans le Studio (idée, tournage, montage). */
export default async function ProjetStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await projetStudioPage(id);
  redirect(`/admin/studio/${id}/montage` as Route);
}
