import { FORMATS_STUDIO, LIBELLES_STATUT_STUDIO } from '@ph/core/studio';
import { formatRelatif } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { listerProjetsStudio } from '@ph/firebase/studio';
import { Badge, EmptyState } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { NouveauMontageLibre } from '@/features/studio/NouveauMontageLibre';
import { TONS_STATUT } from '@/features/studio/tons';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Studio de montage' };

/**
 * Studio de montage (STUDIO.md §5 bis) : démarrer un montage vide, ou rouvrir dans l'éditeur
 * multipistes un projet existant (montage libre ou vidéo montée par Claude).
 */
export default async function StudioMontage() {
  await pageAdmin('/admin/studio/monter', 'studio');
  const projets = (await listerProjetsStudio(getFirestore(appAdmin()))).filter(
    (p) => p.libre || p.plan,
  );
  const maintenant = maintenantServeur();
  return (
    <main className="grid min-w-0 content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <header>
        <Link href={'/admin/studio' as Route} className="text-sm">
          ← Studio
        </Link>
        <h1 className="m-0 mt-1 text-[clamp(26px,3vw,30px)]">Studio de montage</h1>
        <p className="m-0 mt-1 text-neutre-700">
          Pistes, transitions, effets, sous-titres : montez vous-même, comme dans un logiciel de
          montage.
        </p>
      </header>
      <NouveauMontageLibre />
      <section aria-labelledby="projets-montage" className="grid gap-2">
        <h2 id="projets-montage" className="m-0 text-lg">
          Ouvrir un projet
        </h2>
        {projets.length === 0 ? (
          <EmptyState titre="Aucun montage pour l’instant">
            Créez un montage ci-dessus : il s’ouvre directement dans l’éditeur.
          </EmptyState>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {projets.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/studio/${p.id}/montage` as Route}
                  className="flex min-h-11 flex-col gap-1 rounded-card border border-trait bg-blanc p-3.5 no-underline hover:border-neutre-500"
                >
                  <span className="flex items-start justify-between gap-2">
                    <strong className="text-texte">{p.titre}</strong>
                    <Badge tone={TONS_STATUT[p.statut]}>{LIBELLES_STATUT_STUDIO[p.statut]}</Badge>
                  </span>
                  <span className="text-sm text-neutre-700">
                    {p.libre ? 'Montage libre' : 'Monté par Claude'} ·{' '}
                    {FORMATS_STUDIO[p.format].libelle.split(' (')[0]} ·{' '}
                    {formatRelatif(p.updatedAt, maintenant)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
