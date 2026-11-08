import { appAdmin } from '@ph/firebase/admin';
import { listerProjetsStudio } from '@ph/firebase/studio';
import { EmptyState } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { CarteVideo } from '@/features/studio/CarteVideo';
import { NouveauMontageLibre } from '@/features/studio/NouveauMontageLibre';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Studio de montage' };

/**
 * Bouton « Studio » (STUDIO.md §5 bis) : démarrer un montage vide, ou rouvrir dans l'éditeur
 * une vidéo existante (montage libre ou vidéo partie d'une idée).
 */
export default async function StudioMontage() {
  await pageAdmin('/admin/studio/monter', 'studio');
  const projets = (await listerProjetsStudio(getFirestore(appAdmin()))).filter(
    (p) => p.libre || p.statut !== 'sujet',
  );
  const maintenant = maintenantServeur();
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="m-0 text-xl">Studio de montage</h1>
        <p className="m-0 mt-1 text-neutre-700">
          Pistes, transitions, effets, sous-titres : montez vous-même, comme dans un logiciel de
          montage.
        </p>
      </div>
      <NouveauMontageLibre />
      <section aria-labelledby="projets-montage" className="grid gap-3">
        <h2 id="projets-montage" className="m-0 text-lg">
          Ouvrir un projet
        </h2>
        {projets.length === 0 ? (
          <EmptyState titre="Aucun montage pour l’instant">
            Créez un montage ci-dessus : il s’ouvre directement dans l’éditeur.
          </EmptyState>
        ) : (
          <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-6 p-0 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-7">
            {projets.map((p) => (
              <li key={p.id}>
                <CarteVideo
                  projet={p}
                  maintenant={maintenant}
                  href={`/admin/studio/${p.id}/montage`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
