import { TYPES_TACHE_CONVERSION } from '@ph/core/conversion';
import { formatDate } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { listerTachesConversion } from '@ph/firebase/admin-serveur';
import { EmptyState } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { CLASSES_PAGE, EnteteConversion } from '@/features/adminConversion/EnteteConversion';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Tâches de conversion' };

/** Tâches commerciales ouvertes (`filesModeration`) : appels, réponses, risques, activation. */
export default async function TachesConversion() {
  await pageAdmin('/admin/conversion/taches', 'conversion');
  const taches = await listerTachesConversion(getFirestore(appAdmin()));
  return (
    <main className={CLASSES_PAGE}>
      <EnteteConversion actif="/admin/conversion/taches" />
      {taches.length ? (
        <ul className="m-0 grid list-none gap-3 p-0">
          {taches.map((t) => (
            <li key={t.id} className="grid gap-1 rounded-lg border border-trait p-4">
              <p className="m-0 text-sm font-semibold">
                {TYPES_TACHE_CONVERSION[t.type] ?? t.type} · {t.entreprise}
              </p>
              <p className="m-0 text-sm text-neutre-700">
                Créée le {formatDate(t.creeeLe, 'dateHeure')} · assignée : {t.assigneA ?? '—'}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <Link
                  href={`/admin/conversion/fiche/${t.artisanId}` as Route}
                  className="text-accent-700"
                >
                  Ouvrir la fiche cycle
                </Link>
                <Link href="/admin/file" className="text-accent-700">
                  Traiter dans la file de travail
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState titre="Aucune tâche ouverte">
          Les tâches commerciales apparaissent ici dès leur création.
        </EmptyState>
      )}
    </main>
  );
}
