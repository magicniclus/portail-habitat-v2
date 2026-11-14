import { appAdmin } from '@ph/firebase/admin';
import { listerProjetsStudio, type ProjetStudio } from '@ph/firebase/studio';
import { EmptyState } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { CarteVideo } from '@/features/studio/CarteVideo';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Studio' };

const FILTRES = {
  toutes: ['Toutes', () => true],
  encours: ['En cours', (p) => p.statut !== 'pret' && p.statut !== 'erreur'],
  pretes: ['Prêtes', (p) => p.statut === 'pret'],
  relancer: ['À relancer', (p) => p.statut === 'erreur'],
} as const satisfies Record<string, readonly [string, (p: ProjetStudio) => boolean]>;
type Filtre = keyof typeof FILTRES;

/** Studio › Vidéos : toutes les vidéos en grille de miniatures, filtrées par état. */
export default async function Studio({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await pageAdmin('/admin/studio', 'studio');
  const demande = (await searchParams).filtre;
  const filtre: Filtre =
    typeof demande === 'string' && demande in FILTRES ? (demande as Filtre) : 'toutes';
  const projets = await listerProjetsStudio(getFirestore(appAdmin()));
  const visibles = projets.filter(FILTRES[filtre][1]);
  const maintenant = maintenantServeur();
  return (
    <section aria-labelledby="videos-studio" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="videos-studio" className="m-0 text-xl">
          Vidéos
        </h1>
        <nav aria-label="Filtrer les vidéos" className="flex flex-wrap gap-1.5">
          {(Object.keys(FILTRES) as Filtre[]).map((f) => (
            <Link
              key={f}
              href={(f === 'toutes' ? '/admin/studio' : `/admin/studio?filtre=${f}`) as Route}
              aria-current={filtre === f ? 'page' : undefined}
              className="inline-flex min-h-11 items-center rounded-full border border-trait bg-blanc px-4 text-sm font-semibold text-neutre-800 no-underline aria-[current=page]:border-neutre-900 aria-[current=page]:bg-neutre-900 aria-[current=page]:text-blanc"
            >
              {FILTRES[f][0]} ({projets.filter(FILTRES[f][1]).length})
            </Link>
          ))}
        </nav>
      </div>
      {visibles.length === 0 ? (
        <EmptyState titre={projets.length ? 'Aucune vidéo ici' : 'Aucune vidéo pour l’instant'}>
          Cliquez sur « Studio » en haut à droite : tout se fait dedans, avec Claude ou vous-même.
        </EmptyState>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-6 p-0 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-7">
          {visibles.map((p) => (
            <li key={p.id}>
              <CarteVideo projet={p} maintenant={maintenant} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
