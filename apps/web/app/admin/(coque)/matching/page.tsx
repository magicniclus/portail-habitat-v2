import { formatDate } from '@ph/core/format';
import { saisieDepuisConfig } from '@ph/core/matching';
import { appAdmin } from '@ph/firebase/admin';
import { lireAlgorithmeAdmin } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { EditeurAlgorithme } from '@/features/adminAlgorithme/EditeurAlgorithme';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Algorithme' };

/** Maquette « Admin Algorithme » (ADMIN §2.10) : réglages, bac à sable, versions. */
export default async function AlgorithmeAdmin() {
  const s = await pageAdmin('/admin/matching', 'algorithme');
  const { config, versions } = await lireAlgorithmeAdmin(getFirestore(appAdmin()));
  return (
    <main className="grid content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <div>
        <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Algorithme</h1>
        <p className="m-0 text-sm text-neutre-800">
          Version {config.version} en service. Rejouez une demande passée avant de publier.
        </p>
      </div>
      <EditeurAlgorithme
        actuelle={saisieDepuisConfig(config)}
        peut={s.role !== 'lecture' && s.permissions.includes('matching.config')}
      />
      {versions.length ? (
        <section aria-label="Versions" className="grid gap-2">
          <h2 className="m-0 text-lg">Versions</h2>
          <ul className="m-0 grid list-none gap-1 p-0 text-sm">
            {versions.map((v) => (
              <li key={v.version}>
                Version {v.version} · {v.motif} · {formatDate(v.le)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
