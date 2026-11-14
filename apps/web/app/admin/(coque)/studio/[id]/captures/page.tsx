import { redirect } from 'next/navigation';
import type { Route } from 'next';

/** Ancienne étape « captures » : elle se fait maintenant dans le Studio (onglet de la bibliothèque). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/studio/${id}/montage` as Route);
}
