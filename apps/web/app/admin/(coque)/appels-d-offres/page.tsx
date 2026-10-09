import {
  FILTRES_APPELS_OFFRES_ADMIN,
  LIBELLES_MODE_PRIX,
  LIBELLES_STATUT_APPEL_OFFRES,
} from '@ph/core/admin';
import { formatEuros, formatRelatif } from '@ph/core/format';
import { FILTRES_APPELS_OFFRES, type FiltreAppelsOffres } from '@ph/firebase/admin-serveur';
import { Badge } from '@ph/ui';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { FicheAppelOffresAdmin } from '@/features/adminAppelsOffres/FicheAppelOffresAdmin';
import { NavAppelsOffres } from '@/features/adminAppelsOffres/NavAppelsOffres';
import { lireAppelsOffres } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Appels d’offres' };

type Params = Promise<Record<string, string | undefined>>;

const puce =
  'flex min-h-11 items-center rounded-pill border border-trait px-4 text-sm font-semibold text-texte no-underline aria-[current=true]:border-accent-700 aria-[current=true]:bg-accent-700 aria-[current=true]:text-blanc';

/** Back-office › Appels d'offres et prix (ADMIN §2.5) : liste et éditeur de prix. */
export default async function AppelsOffresAdmin({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const s = await pageAdmin('/admin/appels-d-offres', 'appels-offres');
  const filtre = (FILTRES_APPELS_OFFRES as readonly string[]).includes(p.f ?? '')
    ? (p.f as FiltreAppelsOffres)
    : 'ouverts';
  const { maintenant, lignes, fiche } = await lireAppelsOffres(filtre, p.id);
  const url = (q: Record<string, string>) =>
    `/admin/appels-d-offres?${new URLSearchParams(q)}` as Route;
  return (
    <main className="grid gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)] lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        <div>
          <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Appels d’offres</h1>
          <p className="m-0 text-sm text-neutre-800">Prix, déblocages et historique.</p>
        </div>
        <NavAppelsOffres actif="/admin/appels-d-offres" />
        <nav aria-label="Filtres" className="flex flex-wrap gap-2">
          {(Object.keys(FILTRES_APPELS_OFFRES_ADMIN) as FiltreAppelsOffres[]).map((f) => (
            <Link
              key={f}
              href={url({ f })}
              aria-current={f === filtre ? 'true' : undefined}
              className={puce}
            >
              {FILTRES_APPELS_OFFRES_ADMIN[f]}
            </Link>
          ))}
        </nav>
        <ul aria-label="Appels d’offres" className="m-0 grid list-none gap-2 p-0">
          {lignes.length ? null : (
            <li className="text-sm text-neutre-700">Aucun appel d’offres.</li>
          )}
          {lignes.map((a) => (
            <li key={a.id}>
              <Link
                href={url({ f: filtre, id: a.id })}
                aria-current={a.id === p.id ? 'true' : undefined}
                className="grid gap-1 rounded-[12px] border border-trait bg-blanc p-3 text-texte no-underline aria-[current=true]:border-accent-500 aria-[current=true]:bg-accent-100"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{a.titre}</strong>
                  <Badge tone="neutre">{LIBELLES_STATUT_APPEL_OFFRES[a.statut] ?? a.statut}</Badge>
                </span>
                <span className="text-[13px] text-neutre-700">
                  {formatEuros(a.prixBaseCentimes, { suffixe: 'HT' })} ·{' '}
                  {LIBELLES_MODE_PRIX[a.mode]}
                  {a.promo ? ` · −${a.promo} %` : ''} · {a.nbDeblocages}/{a.nbDeblocagesMax}{' '}
                  déblocages · qualité {a.qualiteLead} · {formatRelatif(a.ouvertLe, maintenant)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {fiche ? <FicheAppelOffresAdmin a={fiche} session={s} maintenant={maintenant} /> : null}
    </main>
  );
}
