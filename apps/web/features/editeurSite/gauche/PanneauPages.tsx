'use client';

import type { PageSite } from '@ph/core/sites';
import { Button, cn } from '@ph/ui';
import { useState } from 'react';

const interrupteur = (on: boolean) =>
  cn(
    'relative inline-block h-5 w-9 flex-none rounded-full transition-colors motion-reduce:transition-none',
    on ? 'bg-accent' : 'bg-neutre-300',
  );

/**
 * Pages du site (maquette) : nouvelle page avec l'IA ou vide, liste (menu, référencement), et
 * réglages de la page ouverte (nom, libellé du menu, mise en ligne, suppression).
 */
export function PanneauPages({
  pages,
  pageId,
  onChoisir,
  onAjouter,
  onGenerer,
  onSupprimer,
  onRegler,
  onSeo,
}: {
  pages: Record<string, PageSite>;
  pageId: string;
  onChoisir: (id: string) => void;
  onAjouter: (nom: string, vierge?: boolean) => void;
  /** « Plombier à Pessac » : demande passée à l'assistant IA (création de page). */
  onGenerer: (demande: string) => void;
  onSupprimer: (id: string) => void;
  onRegler: (id: string, p: Partial<PageSite>) => void;
  onSeo: (id: string) => void;
}) {
  const [demande, setDemande] = useState('');
  const page = pages[pageId]!;
  return (
    <div className="grid gap-3">
      <form
        className="grid gap-1.5 rounded-[10px] border border-accent-300 bg-accent-100 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (demande.trim()) onGenerer(demande.trim());
          setDemande('');
        }}
      >
        <label htmlFor="page-ia" className="text-[13px] font-bold text-accent-900">
          Nouvelle page avec l’IA
        </label>
        <input
          id="page-ia"
          value={demande}
          maxLength={120}
          onChange={(e) => setDemande(e.target.value)}
          placeholder="« Plombier à Pessac » ou « Page FAQ »"
          className="min-h-11 rounded-[8px] border border-accent-300 bg-blanc px-3 text-base"
        />
        <div className="flex gap-1.5">
          <Button type="submit" taille="sm" disabled={!demande.trim()}>
            Générer
          </Button>
          <Button
            type="button"
            taille="sm"
            variant="secondaire"
            onClick={() => onAjouter('Nouvelle page', true)}
          >
            Page vierge
          </Button>
        </div>
      </form>
      <ul className="m-0 grid list-none gap-1 p-0">
        {Object.entries(pages)
          .sort(([, a], [, b]) => a.ordre - b.ordre)
          .map(([id, p]) => (
            <li
              key={id}
              className={cn(
                'flex items-center gap-2 rounded-[10px] border px-2.5 py-1',
                id === pageId ? 'border-accent-300 bg-accent-100' : 'border-trait bg-blanc',
              )}
            >
              <button
                type="button"
                onClick={() => onChoisir(id)}
                aria-current={id === pageId ? 'page' : undefined}
                className="grid min-h-11 min-w-0 flex-1 gap-px text-left"
              >
                <span className="text-sm font-semibold">{p.nom}</span>
                <span className="truncate text-xs text-neutre-600">
                  /{p.slug} · {p.statut === 'publiee' ? 'publiée' : 'brouillon'}
                </span>
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={p.menu}
                aria-label={`Afficher « ${p.nom} » dans le menu`}
                onClick={() => onRegler(id, { menu: !p.menu })}
                className="flex min-h-11 items-center gap-1.5 text-[11px] text-neutre-700"
              >
                <span aria-hidden="true" className={interrupteur(p.menu)}>
                  <span
                    className={cn(
                      'absolute top-0.5 size-4 rounded-full bg-blanc shadow',
                      p.menu ? 'left-[18px]' : 'left-0.5',
                    )}
                  />
                </span>
                Menu
              </button>
              <button
                type="button"
                onClick={() => onSeo(id)}
                aria-label={`Référencement de « ${p.nom} »`}
                className="min-h-11 px-1 text-xs font-bold text-accent-800"
              >
                SEO
              </button>
            </li>
          ))}
      </ul>
      <details className="rounded-[10px] border border-trait p-3">
        <summary className="min-h-11 cursor-pointer content-center text-sm font-bold">
          Réglages de « {page.nom} »
        </summary>
        <div className="mt-2 grid gap-3">
          <label className="grid gap-1.5 text-[13px] font-bold text-neutre-800">
            Nom
            <input
              value={page.nom}
              maxLength={80}
              onChange={(e) => onRegler(pageId, { nom: e.target.value })}
              className="min-h-11 rounded-[8px] border border-trait px-3 text-base font-normal"
            />
          </label>
          <label className="grid gap-1.5 text-[13px] font-bold text-neutre-800">
            Libellé dans le menu
            <input
              value={page.court}
              maxLength={40}
              onChange={(e) => onRegler(pageId, { court: e.target.value })}
              className="min-h-11 rounded-[8px] border border-trait px-3 text-base font-normal"
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={page.statut === 'publiee'}
              disabled={pageId === 'accueil'}
              onChange={(e) =>
                onRegler(pageId, { statut: e.target.checked ? 'publiee' : 'brouillon' })
              }
              className="size-5 accent-accent"
            />
            Mettre en ligne à la prochaine publication
          </label>
          {pageId === 'accueil' ? null : (
            <Button variant="danger" taille="sm" onClick={() => onSupprimer(pageId)}>
              Supprimer la page
            </Button>
          )}
        </div>
      </details>
    </div>
  );
}
