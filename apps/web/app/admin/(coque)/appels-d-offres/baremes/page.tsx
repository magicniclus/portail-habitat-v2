import { saisieDepuisBareme } from '@ph/core/admin';
import { formatDate } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { lireBaremesAdmin } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { EditeurBareme } from '@/features/adminAppelsOffres/EditeurBareme';
import { NavAppelsOffres } from '@/features/adminAppelsOffres/NavAppelsOffres';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Barèmes' };

/** Barème des appels d'offres : édition, simulation sur 50 leads (ADM-05), versions. */
export default async function BaremesAdmin() {
  const s = await pageAdmin('/admin/appels-d-offres/baremes', 'appels-offres');
  const { actif, versions } = await lireBaremesAdmin(getFirestore(appAdmin()));
  const peutModifier = s.permissions.includes('leads.prix');
  return (
    <main className="grid content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <div>
        <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Barèmes</h1>
        <p className="m-0 text-sm text-neutre-800">
          {actif.version ? `Version ${actif.version} active` : 'Barème initial (D47)'} · les prix
          déjà publiés ne changent pas.
        </p>
      </div>
      <NavAppelsOffres actif="/admin/appels-d-offres/baremes" />
      {peutModifier ? (
        <EditeurBareme
          actuel={saisieDepuisBareme(actif.bareme)}
          peutPublier={s.permissions.includes('leads.prix_illimite')}
        />
      ) : (
        <p className="m-0 text-sm">Permission requise : leads.prix</p>
      )}
      {versions.length ? (
        <section aria-label="Versions" className="grid gap-2">
          <h2 className="m-0 text-lg">Versions</h2>
          <ul className="m-0 grid list-none gap-1 p-0 text-sm">
            {versions.map((v) => (
              <li key={v.id}>
                Version {v.version} · {formatDate(v.le)}
                {v.actif ? ' · active' : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
