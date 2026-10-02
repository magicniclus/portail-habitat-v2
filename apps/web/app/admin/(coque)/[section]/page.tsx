import { SECTIONS_ADMIN } from '@ph/core/admin';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageAdmin } from '@/server/sessionAdmin';

type Params = Promise<{ section: string }>;

const sectionDe = (chemin: string) => SECTIONS_ADMIN.find((s) => s.chemin === chemin && chemin);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return { title: sectionDe((await params).section)?.libelle ?? 'Admin' };
}

/**
 * Sections dont l'écran n'est pas encore livré : la permission est déjà vérifiée (403 sinon,
 * ADM-01). Chaque écran livré remplace cette page par son propre dossier.
 */
export default async function SectionAdmin({ params }: { params: Params }) {
  const { section } = await params;
  const def = sectionDe(section);
  if (!def) notFound();
  await pageAdmin(`/admin/${section}`, def.id);
  return (
    <main className="grid gap-3 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <h1 className="m-0 text-[clamp(26px,3vw,32px)]">{def.libelle}</h1>
      <p className="m-0 text-base text-neutre-800">
        Cette section arrive dans une prochaine étape.
      </p>
    </main>
  );
}
