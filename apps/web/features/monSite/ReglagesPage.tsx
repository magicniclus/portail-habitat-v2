'use client';

import { cn } from '@ph/ui';
import type { ReactNode } from 'react';
import type { LignePage } from '@/server/sites';
import { useAppelSite } from './appelSite';

/**
 * Menu et Dépublier / Mettre en ligne d'une page : réglés dans le brouillon, en ligne à la
 * prochaine publication (« Publier les modifications » apparaît en haut). L'accueil reste en ligne.
 */
export function ReglagesPage({ page, children }: { page: LignePage; children: ReactNode }) {
  const { appeler, erreur, enCours } = useAppelSite();
  const regler = (r: { menu?: boolean; statut?: LignePage['statut'] }) =>
    void appeler('page/reglage', { pageId: page.id, ...r });
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={page.menu}
        aria-label={`Afficher « ${page.nom} » dans le menu`}
        disabled={enCours}
        onClick={() => regler({ menu: !page.menu })}
        className="flex min-h-11 items-center gap-2 text-sm text-neutre-800"
      >
        <span
          aria-hidden="true"
          className={cn(
            'relative inline-block h-5 w-9 rounded-full',
            page.menu ? 'bg-accent' : 'bg-neutre-300',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 size-4 rounded-full bg-blanc shadow',
              page.menu ? 'left-[18px]' : 'left-0.5',
            )}
          />
        </span>
        Menu
      </button>
      <span className="flex items-center gap-1.5">
        {children}
        {page.id === 'accueil' ? null : (
          <button
            type="button"
            disabled={enCours}
            onClick={() => regler({ statut: page.statut === 'publiee' ? 'brouillon' : 'publiee' })}
            className="min-h-11 px-1.5 text-sm font-semibold text-accent-800 hover:underline"
          >
            {page.statut === 'publiee' ? 'Dépublier' : 'Mettre en ligne'}
          </button>
        )}
      </span>
      {erreur ? (
        <p role="alert" className="m-0 w-full text-sm text-danger">
          {erreur}
        </p>
      ) : null}
    </>
  );
}
