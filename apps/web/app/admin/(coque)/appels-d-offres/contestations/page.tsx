import { formatEuros, formatRelatif } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { listerContestationsAdmin } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { DecisionContestation } from '@/features/adminAppelsOffres/DecisionContestation';
import { NavAppelsOffres } from '@/features/adminAppelsOffres/NavAppelsOffres';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Contestations' };

/** File des contestations d'appels d'offres (ADMIN §2.5), les plus anciennes d'abord. */
export default async function ContestationsAdmin() {
  const s = await pageAdmin('/admin/appels-d-offres/contestations', 'appels-offres');
  const liste = await listerContestationsAdmin(getFirestore(appAdmin()));
  const maintenant = maintenantServeur();
  const p = (x: string) => s.permissions.includes(x);
  return (
    <main className="grid content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <div>
        <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Contestations</h1>
        <p className="m-0 text-sm text-neutre-800">Délai cible : 72 h.</p>
      </div>
      <NavAppelsOffres actif="/admin/appels-d-offres/contestations" />
      <ul aria-label="Contestations" className="m-0 grid list-none gap-3 p-0">
        {liste.length ? null : <li className="text-sm text-neutre-700">Aucune contestation.</li>}
        {liste.map((c) => (
          <li
            key={c.id}
            className="grid gap-3 rounded-[12px] border border-trait bg-blanc p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="grid gap-1">
              <strong>
                {c.appelOffres} · {c.artisan}
              </strong>
              <span className="text-sm">
                Motif : {c.motif} ·{' '}
                {c.moyen === 'carte'
                  ? `${formatEuros(c.prixHtCentimes, { suffixe: 'HT' })} (carte)`
                  : `${c.credits} crédit${c.credits > 1 ? 's' : ''}`}{' '}
                · {formatRelatif(c.creeLe, maintenant)}
              </span>
              <span className="text-sm text-neutre-800">{c.details}</span>
              <span className="text-[13px] text-neutre-700">
                {c.parArtisan} contestation{c.parArtisan > 1 ? 's' : ''} de cet artisan ·{' '}
                {c.memeDemande} sur la même demande
              </span>
            </div>
            {s.role !== 'lecture' ? (
              <DecisionContestation
                id={c.id}
                titre={c.appelOffres}
                carte={c.moyen === 'carte'}
                droits={{
                  rembourser: p('leads.rembourser'),
                  carte: p('finances.rembourser_carte'),
                }}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
