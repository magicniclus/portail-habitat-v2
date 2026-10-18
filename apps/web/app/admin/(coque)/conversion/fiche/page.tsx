import { Button, Field, Input } from '@ph/ui';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { CLASSES_PAGE, EnteteConversion } from '@/features/adminConversion/EnteteConversion';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Fiche cycle' };

/** Accès à la fiche cycle d'une entreprise (aussi depuis le journal et les tâches). */
export default async function RechercheFicheCycle({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  await pageAdmin('/admin/conversion/fiche', 'conversion');
  const id = (await searchParams).id?.trim();
  if (id && /^[\w-]{1,64}$/.test(id)) redirect(`/admin/conversion/fiche/${id}` as Route);
  return (
    <main className={CLASSES_PAGE}>
      <EnteteConversion actif="/admin/conversion/fiche" />
      <form method="get" className="flex max-w-[480px] flex-wrap items-end gap-2">
        <Field label="Identifiant de l’entreprise" className="grow">
          <Input name="id" required autoComplete="off" />
        </Field>
        <Button type="submit">Ouvrir</Button>
      </form>
      <p className="m-0 text-sm text-neutre-700">
        Astuce : le journal et les tâches ouvrent directement la fiche.
      </p>
    </main>
  );
}
