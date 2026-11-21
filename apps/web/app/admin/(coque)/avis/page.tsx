import { FILTRES_AVIS_ADMIN, LIBELLES_STATUT_AVIS } from '@ph/core/admin';
import { formatDate } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { FILTRES_AVIS, listerAvisAdmin, type FiltreAvis } from '@ph/firebase/admin-serveur';
import { Badge } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { ActionsAvis } from '@/features/adminAvis/ActionsAvis';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Avis' };

type Params = Promise<Record<string, string | undefined>>;

const puce =
  'flex min-h-11 items-center rounded-pill border border-trait px-4 text-sm font-semibold text-texte no-underline aria-[current=true]:border-accent-700 aria-[current=true]:bg-accent-700 aria-[current=true]:text-blanc';
const TON = { faible: 'succes', moyen: 'attention', eleve: 'danger' } as const;

/** Maquette « Admin Avis » (ADMIN §2.6) : publication sous 48 h, score de risque. */
export default async function AvisAdmin({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const s = await pageAdmin('/admin/avis', 'avis');
  const filtre = (FILTRES_AVIS as readonly string[]).includes(p.f ?? '')
    ? (p.f as FiltreAvis)
    : 'attente';
  const liste = await listerAvisAdmin(getFirestore(appAdmin()), filtre);
  return (
    <main className="grid content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <div>
        <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Avis</h1>
        <p className="m-0 text-sm text-neutre-800">
          Publication sous 48 h. Le score de risque combine IP, ancienneté du compte, texte dupliqué
          et lien avec l’artisan.
        </p>
      </div>
      <nav aria-label="Filtres" className="flex flex-wrap gap-2">
        {(Object.keys(FILTRES_AVIS_ADMIN) as FiltreAvis[]).map((f) => (
          <Link
            key={f}
            href={`/admin/avis?f=${f}` as Route}
            aria-current={f === filtre ? 'true' : undefined}
            className={puce}
          >
            {FILTRES_AVIS_ADMIN[f]}
          </Link>
        ))}
      </nav>
      <ul aria-label="Avis" className="m-0 grid list-none gap-3 p-0">
        {liste.length ? null : <li className="text-sm text-neutre-700">Aucun avis.</li>}
        {liste.map((a) => (
          <li key={a.id} className="grid gap-2.5 rounded-[12px] border border-trait bg-blanc p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="grid gap-0.5">
                <strong>
                  {a.artisan}{' '}
                  <span aria-label={`${a.note} sur 5`}>
                    {'★'.repeat(a.note)}
                    {'☆'.repeat(5 - a.note)}
                  </span>
                </strong>
                <span className="text-[13px] text-neutre-700">
                  par {a.auteur} · {formatDate(a.creeLe)} ·{' '}
                  {LIBELLES_STATUT_AVIS[a.statut] ?? a.statut}
                  {a.signalements ? ` · ${a.signalements} signalement(s)` : ''}
                </span>
              </div>
              {a.risque ? <Badge tone={TON[a.risque.niveau]}>Risque {a.risque.score}</Badge> : null}
            </div>
            <p className="m-0 text-[15px] leading-normal">{a.texte}</p>
            {a.risque?.raisons.length ? (
              <p className="m-0 text-[13px] text-neutre-700">{a.risque.raisons.join(' · ')}</p>
            ) : null}
            {s.role !== 'lecture' ? (
              <ActionsAvis
                id={a.id}
                titre={`avis de ${a.auteur} sur ${a.artisan}`}
                statut={a.statut}
                droits={{
                  moderer: s.permissions.includes('avis.moderer'),
                  supprimer: s.permissions.includes('avis.supprimer'),
                }}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
