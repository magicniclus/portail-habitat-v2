'use client';

import { ETAPES_PROJET, LIBELLES_ETAPE_PROJET, type EtapeProjet } from '@ph/core/studio';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Barre d'étapes d'un projet Studio : une page par étape, les suivantes grisées tant qu'elles
 * ne sont pas prêtes. Quand le projet passe à l'étape suivante (sujet choisi, prise envoyée,
 * vidéo prête), on y va tout seul ; on peut toujours revenir en arrière.
 */
export function EtapesProjet({
  projetId,
  accessibles,
  enCours,
}: {
  projetId: string;
  accessibles: EtapeProjet[];
  enCours: EtapeProjet;
}) {
  const chemin = usePathname();
  const router = useRouter();
  const base = `/admin/studio/${projetId}`;
  const precedente = useRef(enCours);
  useEffect(() => {
    if (precedente.current === enCours) return;
    precedente.current = enCours;
    router.push(`${base}/${enCours}` as Route);
  }, [enCours, base, router]);

  return (
    <nav aria-label="Étapes de la vidéo">
      <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
        {ETAPES_PROJET.map((e, i) => {
          const actif = chemin === `${base}/${e}`;
          const ouvert = accessibles.includes(e);
          const contenu = (
            <>
              <span
                aria-hidden="true"
                className={`flex size-6 flex-none items-center justify-center rounded-full text-xs font-bold ${actif ? 'bg-blanc text-accent' : ouvert ? 'bg-accent-100 text-accent-800' : 'bg-neutre-200 text-neutre-700'}`}
              >
                {i + 1}
              </span>
              {LIBELLES_ETAPE_PROJET[e]}
            </>
          );
          return (
            <li key={e} className="flex items-center gap-1">
              {i > 0 ? (
                <span aria-hidden="true" className="px-1 text-neutre-400">
                  ›
                </span>
              ) : null}
              {ouvert ? (
                <Link
                  href={`${base}/${e}` as Route}
                  aria-current={actif ? 'step' : undefined}
                  className={`flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold no-underline ${actif ? 'bg-accent text-blanc' : 'text-texte hover:bg-neutre-100'}`}
                >
                  {contenu}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="flex min-h-11 items-center gap-2 px-3 text-sm text-neutre-700"
                >
                  {contenu}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
