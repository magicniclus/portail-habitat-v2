import { appAdmin } from '@ph/firebase/admin';
import { listerComptesStudio, listerIdeesStudio, listerSeriesStudio } from '@ph/firebase/studio';
import { EmptyState } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { BoutonCommentaires } from '@/features/studio/BoutonCommentaires';
import { IdeesGardees } from '@/features/studio/IdeesGardees';
import { Series } from '@/features/studio/Series';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Studio · idées' };
/** Idées tirées des commentaires ou épisode suivant : un appel à Claude peut durer plusieurs minutes. */
export const maxDuration = 300;

/** Studio › Idées : idées gardées, séries d'épisodes, idées tirées des commentaires. */
export default async function IdeesStudio() {
  await pageAdmin('/admin/studio/idees', 'studio');
  const db = getFirestore(appAdmin());
  const [idees, series, comptes] = await Promise.all([
    listerIdeesStudio(db),
    listerSeriesStudio(db),
    listerComptesStudio(db),
  ]);
  const manque = [
    ...(process.env.ANTHROPIC_API_KEY ? [] : ['ANTHROPIC_API_KEY (Claude)']),
    ...(process.env.YOUTUBE_API_KEY ? [] : ['YOUTUBE_API_KEY (tendances YouTube)']),
  ];
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-xl">Idées</h1>
        {/* Les commentaires se lisent par les comptes connectés (Studio › Réseaux). */}
        {comptes.some((c) => c.reseau !== 'tiktok') ? <BoutonCommentaires /> : null}
      </div>
      {manque.length ? (
        <p className="m-0 text-sm text-neutre-700">
          À ajouter dans <code>.env.local</code> pour des idées plus justes : {manque.join(', ')}.
        </p>
      ) : null}
      {idees.length ? (
        <IdeesGardees idees={idees} />
      ) : (
        <EmptyState titre="Aucune idée gardée">
          Quand Claude propose des vidéos, ☆ garde une idée pour plus tard : elle se retrouve ici.
        </EmptyState>
      )}
      <Series series={series} />
    </div>
  );
}
