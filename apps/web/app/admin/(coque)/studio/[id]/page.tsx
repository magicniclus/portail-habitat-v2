import { etapeProjet } from '@ph/core/studio';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { etatEtapes, projetStudioPage } from '@/features/studio/projetPage';

/** Ouvrir un projet : on arrive sur l'étape en cours (« analyse=1 » lance la recherche d'idées). */
export default async function ProjetStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const analyse = (await searchParams).analyse === '1';
  const p = await projetStudioPage(id);
  const etape = etapeProjet(etatEtapes(p));
  redirect(
    `/admin/studio/${id}/${etape}${analyse && etape === 'idees' ? '?analyse=1' : ''}` as Route,
  );
}
