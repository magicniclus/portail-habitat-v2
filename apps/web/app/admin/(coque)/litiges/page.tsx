import {
  FILTRES_LITIGES_ADMIN,
  LIBELLES_AUTEUR_LITIGE,
  LIBELLES_STATUT_LITIGE,
} from '@ph/core/admin';
import { formatDate, formatRelatif } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import {
  FILTRES_LITIGES,
  lireLitigeAdmin,
  listerLitigesAdmin,
  type FiltreLitiges,
} from '@ph/firebase/admin-serveur';
import { Badge } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { ActionsLitige } from '@/features/adminLitiges/ActionsLitige';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Litiges' };

type Params = Promise<Record<string, string | undefined>>;

const puce =
  'flex min-h-11 items-center rounded-pill border border-trait px-4 text-sm font-semibold text-texte no-underline aria-[current=true]:border-accent-700 aria-[current=true]:bg-accent-700 aria-[current=true]:text-blanc';

/** Maquette « Admin Litiges » (ADMIN §2.7) : fil d'échanges et décision. */
export default async function LitigesAdmin({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const s = await pageAdmin('/admin/litiges', 'litiges');
  const filtre = (FILTRES_LITIGES as readonly string[]).includes(p.f ?? '')
    ? (p.f as FiltreLitiges)
    : 'ouverts';
  const db = getFirestore(appAdmin());
  const [liste, fiche] = await Promise.all([
    listerLitigesAdmin(db, filtre),
    p.id ? lireLitigeAdmin(db, p.id) : null,
  ]);
  const maintenant = maintenantServeur();
  const url = (q: Record<string, string>) => `/admin/litiges?${new URLSearchParams(q)}` as Route;
  return (
    <main className="grid gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)] lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Litiges</h1>
        <nav aria-label="Filtres" className="flex flex-wrap gap-2">
          {(Object.keys(FILTRES_LITIGES_ADMIN) as FiltreLitiges[]).map((f) => (
            <Link
              key={f}
              href={url({ f })}
              aria-current={f === filtre ? 'true' : undefined}
              className={puce}
            >
              {FILTRES_LITIGES_ADMIN[f]}
            </Link>
          ))}
        </nav>
        <ul aria-label="Litiges" className="m-0 grid list-none gap-2 p-0">
          {liste.length ? null : <li className="text-sm text-neutre-700">Aucun litige.</li>}
          {liste.map((l) => (
            <li key={l.id}>
              <Link
                href={url({ f: filtre, id: l.id })}
                aria-current={l.id === p.id ? 'true' : undefined}
                className="grid gap-1 rounded-[12px] border border-trait bg-blanc p-3 text-texte no-underline aria-[current=true]:border-accent-500 aria-[current=true]:bg-accent-100"
              >
                <strong>{l.titre}</strong>
                <span className="text-[13px] text-neutre-700">
                  {l.particulier} ↔ {l.artisan} · {formatRelatif(l.creeLe, maintenant)}
                </span>
                <Badge tone="neutre">{LIBELLES_STATUT_LITIGE[l.statut] ?? l.statut}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {fiche ? (
        <section
          aria-label={`Litige : ${fiche.particulier} et ${fiche.artisan}`}
          className="grid content-start gap-4 rounded-[16px] border border-trait bg-blanc p-5"
        >
          <header className="grid gap-1">
            <h2 className="m-0 text-[20px]">
              {fiche.particulier} ↔ {fiche.artisan}
            </h2>
            <p className="m-0 text-sm text-neutre-700">
              {LIBELLES_STATUT_LITIGE[fiche.statut]} · ouvert le {formatDate(fiche.creeLe)}
            </p>
          </header>
          <p className="m-0">{fiche.description}</p>
          <ol aria-label="Échanges" className="m-0 grid list-none gap-2 p-0">
            {fiche.echanges.map((x) => (
              <li
                key={`${x.le}-${x.auteur}`}
                className="grid gap-0.5 rounded-[10px] bg-neutre-100 px-3 py-2 text-sm"
              >
                <strong>
                  {LIBELLES_AUTEUR_LITIGE[x.auteur]} · {formatDate(x.le)}
                </strong>
                <span>{x.texte}</span>
              </li>
            ))}
          </ol>
          {['ouvert', 'mediation'].includes(fiche.statut) && s.role !== 'lecture' ? (
            <ActionsLitige id={fiche.id} peut={s.permissions.includes('litiges.traiter')} />
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
