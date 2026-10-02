import { FILTRES_DEMANDES_ADMIN, LIBELLES_STATUT_DEMANDE_ADMIN } from '@ph/core/admin';
import { formatDate, formatFourchette } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import {
  FILTRES_DEMANDES,
  lireDemandeAdmin,
  listerDemandesAdmin,
  type FiltreDemandes,
} from '@ph/firebase/admin-serveur';
import { Badge, Input } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { FicheDemandeAdmin } from '@/features/adminDemandes/FicheDemandeAdmin';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Demandes' };

type Params = Promise<Record<string, string | undefined>>;

const puce =
  'flex min-h-11 items-center rounded-pill border border-trait px-4 text-sm font-semibold text-texte no-underline aria-[current=true]:border-accent-700 aria-[current=true]:bg-accent-700 aria-[current=true]:text-blanc';

/** Maquette « Admin Demandes » (ADMIN §2.4) : liste filtrée, détail avec la trace de l'algorithme. */
export default async function DemandesAdmin({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const s = await pageAdmin('/admin/demandes', 'demandes');
  const filtre = (FILTRES_DEMANDES as readonly string[]).includes(p.f ?? '')
    ? (p.f as FiltreDemandes)
    : 'toutes';
  const db = getFirestore(appAdmin());
  const [lignes, fiche] = await Promise.all([
    listerDemandesAdmin(db, { filtre, ...(p.ref ? { reference: p.ref } : {}) }),
    p.id ? lireDemandeAdmin(db, p.id) : null,
  ]);
  const url = (q: Record<string, string>) => `/admin/demandes?${new URLSearchParams(q)}` as Route;
  return (
    <main className="grid gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)] lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        <div>
          <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Demandes</h1>
          <p className="m-0 text-sm text-neutre-800">Avec la trace complète de l’algorithme.</p>
        </div>
        <form action="/admin/demandes">
          <label className="sr-only" htmlFor="ref-demande">
            Référence
          </label>
          <Input
            id="ref-demande"
            type="search"
            name="ref"
            defaultValue={p.ref ?? ''}
            placeholder="Référence PH-…"
          />
        </form>
        <nav aria-label="Filtres" className="flex flex-wrap gap-2">
          {(Object.keys(FILTRES_DEMANDES_ADMIN) as FiltreDemandes[]).map((f) => (
            <Link
              key={f}
              href={url({ f })}
              aria-current={f === filtre && !p.ref ? 'true' : undefined}
              className={puce}
            >
              {FILTRES_DEMANDES_ADMIN[f]}
            </Link>
          ))}
        </nav>
        <ul aria-label="Demandes" className="m-0 grid list-none gap-2 p-0">
          {lignes.map((d) => (
            <li key={d.id}>
              <Link
                href={url({ f: filtre, id: d.id })}
                aria-current={d.id === p.id ? 'true' : undefined}
                className="grid gap-1 rounded-[12px] border border-trait bg-blanc p-3 text-texte no-underline aria-[current=true]:border-accent-500 aria-[current=true]:bg-accent-100"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{d.reference}</strong>
                  <Badge tone="neutre">{LIBELLES_STATUT_DEMANDE_ADMIN[d.statut] ?? d.statut}</Badge>
                </span>
                <span className="text-[13px] text-neutre-700">
                  {d.prestationId} · {d.ville} · {formatFourchette(d.budget.min, d.budget.max)} ·{' '}
                  {formatDate(d.creeLe)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {fiche ? <FicheDemandeAdmin d={fiche} session={s} /> : null}
    </main>
  );
}
