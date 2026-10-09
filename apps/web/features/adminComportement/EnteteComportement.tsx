import { PAGES_COMPORTEMENT, type PageSuivie } from '@ph/core/comportement';
import { classesChip } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { ChoixPage } from './ChoixPage';
import { lienFiltres, type FiltresComportement } from './filtres';

const APPAREILS = [
  ['ordinateur', 'Ordinateur'],
  ['tablette', 'Tablette'],
  ['mobile', 'Mobile'],
] as const;
const PERIODES = [
  ['7j', '7 j'],
  ['30j', '30 j'],
  ['90j', '90 j'],
] as const;
const ONGLETS = [
  ['cartes', 'Cartes et frictions'],
  ['replays', 'Replays'],
] as const;

/** Titre, onglets et filtres (page, appareil, période) : tout est dans l'URL. */
export function EnteteComportement({ f, replays }: { f: FiltresComportement; replays: boolean }) {
  const lien = (c: Partial<FiltresComportement>) => lienFiltres(f, c) as Route;
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-[clamp(26px,3vw,30px)]">Comportement des visiteurs</h1>
          <p className="m-0 mt-1 text-neutre-800">
            Clics, trajets du curseur, arrêts, défilement, frictions et sorties, page par page.
            Visiteurs ayant accepté la mesure détaillée uniquement.
          </p>
        </div>
        <nav aria-label="Vues" className="flex gap-1 rounded-control bg-neutre-200 p-1">
          {ONGLETS.filter(([id]) => id === 'cartes' || replays).map(([id, nom]) => (
            <Link
              key={id}
              href={lien({ onglet: id })}
              aria-current={f.onglet === id ? 'page' : undefined}
              className="flex min-h-11 items-center rounded-control px-3.5 text-sm font-semibold text-texte no-underline aria-[current=page]:bg-blanc"
            >
              {nom}
            </Link>
          ))}
        </nav>
      </header>
      <div className="flex flex-wrap items-center gap-2.5">
        <ChoixPage
          valeur={f.page}
          options={Object.entries(PAGES_COMPORTEMENT).map(([id, p]) => ({
            id: id as PageSuivie,
            nom: p.nom,
          }))}
          liens={Object.fromEntries(
            Object.keys(PAGES_COMPORTEMENT).map((id) => [
              id,
              lienFiltres(f, { page: id as PageSuivie }),
            ]),
          )}
        />
        {APPAREILS.map(([id, nom]) => (
          <Link
            key={id}
            href={lien({ appareil: id })}
            aria-pressed={f.appareil === id}
            className={classesChip}
          >
            {nom}
          </Link>
        ))}
        {f.onglet === 'cartes'
          ? PERIODES.map(([id, nom]) => (
              <Link
                key={id}
                href={lien({ periode: id })}
                aria-pressed={f.periode === id}
                className={classesChip}
              >
                {nom}
              </Link>
            ))
          : null}
      </div>
    </>
  );
}
