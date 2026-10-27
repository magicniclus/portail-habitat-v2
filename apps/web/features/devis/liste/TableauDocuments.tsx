'use client';

import { formatDate, formatEuros } from '@ph/core/format';
import { cn, EmptyState, Input, ToastProvider } from '@ph/ui';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import type { Route } from 'next';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { BasculeHtTtc } from './BasculeHtTtc';
import { Pagination } from './Pagination';

const PAR_PAGE = 25;
const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });
const sansAccent = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export interface LigneTableau {
  id: string;
  href: string;
  date: number;
  icone: ReactNode;
  numero: string;
  client: string;
  objet: string;
  htCentimes: number;
  ttcCentimes: number;
  /** Avoir : montant précédé de « − ». */
  negatif?: boolean;
  statut: ReactNode;
  /** Libellé du lien d'action (« Modifier le devis D-2026-0001 »). */
  action: string;
  iconeAction: ReactNode;
  /** Menu « ⋮ » selon le statut. */
  menu?: ReactNode;
}

const iconeLien =
  'grid size-11 place-items-center rounded-full text-neutre-800 hover:bg-neutre-100 focus-visible:outline-2 focus-visible:outline-accent';

/**
 * Liste des devis ou des factures (capture du propriétaire) : recherche, montants HT ou TTC,
 * tableau (date, statut, numéro, client et objet, montant, statut modifiable, actions), 25 par page.
 * Sous 800 px chaque ligne devient une carte.
 */
export function TableauDocuments({
  libelle,
  lignes,
  creer,
  vide,
}: {
  libelle: string;
  lignes: LigneTableau[];
  creer?: ReactNode;
  vide: ReactNode;
}) {
  const [recherche, setRecherche] = useState('');
  const [ttc, setTtc] = useState(true);
  const [page, setPage] = useState(0);
  const q = sansAccent(recherche.trim());
  const trouvees = q
    ? lignes.filter((l) => sansAccent(`${l.numero} ${l.client} ${l.objet}`).includes(q))
    : lignes;
  const pages = Math.max(1, Math.ceil(trouvees.length / PAR_PAGE));
  const p = Math.min(page, pages - 1);
  const visibles = trouvees.slice(p * PAR_PAGE, (p + 1) * PAR_PAGE);

  return (
    <ToastProvider>
      <section aria-label={libelle} className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-[1_1_260px]">
            <span className="sr-only">Rechercher</span>
            <MagnifyingGlassIcon
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-neutre-700"
            />
            <Input
              type="search"
              placeholder="Rechercher un client, un objet, un numéro…"
              value={recherche}
              onChange={(x) => {
                setRecherche(x.target.value);
                setPage(0);
              }}
              className="pl-10"
            />
          </label>
          <BasculeHtTtc ttc={ttc} onTtc={setTtc} />
          {creer}
        </div>
        {!lignes.length ? (
          vide
        ) : !trouvees.length ? (
          <EmptyState titre="Aucun résultat">Essayez un autre nom, objet ou numéro.</EmptyState>
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-trait bg-blanc">
            <table className="w-full border-collapse text-[15px]">
              <thead className="max-[799px]:sr-only">
                <tr className="border-b border-trait bg-neutre-100 text-left text-sm text-neutre-800">
                  <th scope="col" className="w-32 px-4 py-3 font-semibold">
                    Date
                  </th>
                  <th scope="col" className="w-10 px-1 py-3">
                    <span className="sr-only">Type de statut</span>
                  </th>
                  <th scope="col" className="w-40 px-3 py-3 font-semibold">
                    Numéro
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Client — objet
                  </th>
                  <th scope="col" className="w-40 px-3 py-3 text-right font-semibold">
                    Montant {ttc ? 'TTC' : 'HT'}
                  </th>
                  <th scope="col" className="w-48 px-3 py-3 font-semibold">
                    Statut
                  </th>
                  <th scope="col" className="w-24 px-3 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-trait last:border-b-0 hover:bg-neutre-100/60 max-[799px]:grid max-[799px]:grid-cols-[auto_minmax(0,1fr)_auto] max-[799px]:items-center max-[799px]:gap-x-3 max-[799px]:gap-y-1 max-[799px]:p-3"
                  >
                    <td className="px-4 py-2 text-neutre-800 tabular-nums max-[799px]:col-span-2 max-[799px]:row-start-1 max-[799px]:p-0 max-[799px]:text-sm">
                      {formatDate(l.date)}
                    </td>
                    <td className="px-1 py-2 text-neutre-700 max-[799px]:hidden">{l.icone}</td>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap max-[799px]:col-span-2 max-[799px]:p-0">
                      <Link
                        href={l.href as Route}
                        className="text-texte no-underline hover:underline"
                      >
                        {l.numero || 'Brouillon'}
                      </Link>
                    </td>
                    <td className="max-w-0 px-3 py-2 max-[799px]:col-span-3 max-[799px]:max-w-none max-[799px]:p-0">
                      <span className="block truncate">
                        <strong className="font-semibold">{l.client || 'Client à préciser'}</strong>
                        <span className="text-neutre-800"> — {l.objet || 'Sans objet'}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap tabular-nums max-[799px]:col-start-3 max-[799px]:row-start-1 max-[799px]:p-0">
                      {l.negatif ? '− ' : ''}
                      {eur(ttc ? l.ttcCentimes : l.htCentimes)}
                    </td>
                    <td className="px-3 py-2 max-[799px]:col-span-2 max-[799px]:p-0">{l.statut}</td>
                    <td className="px-3 py-2 text-right max-[799px]:p-0">
                      <span className="flex items-center justify-end gap-1">
                        <Link
                          href={l.href as Route}
                          aria-label={l.action}
                          title={l.action}
                          className={cn(iconeLien, 'ml-auto')}
                        >
                          {l.iconeAction}
                        </Link>
                        {l.menu}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={p} parPage={PAR_PAGE} total={trouvees.length} onPage={setPage} />
      </section>
    </ToastProvider>
  );
}
