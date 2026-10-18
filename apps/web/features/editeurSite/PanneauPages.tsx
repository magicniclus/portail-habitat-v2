'use client';

import { STATUTS_PAGE, type PageSite } from '@ph/core/sites';
import { Button, Checkbox, Field, Input, StatusBadge } from '@ph/ui';
import { useState } from 'react';

/** Pages : choisir, ajouter, régler (nom, menu, en ligne ou brouillon), supprimer (sauf l'accueil). */
export function PanneauPages({
  pages,
  pageId,
  onChoisir,
  onAjouter,
  onSupprimer,
  onRegler,
}: {
  pages: Record<string, PageSite>;
  pageId: string;
  onChoisir: (id: string) => void;
  onAjouter: (nom: string) => void;
  onSupprimer: (id: string) => void;
  onRegler: (p: Partial<PageSite>) => void;
}) {
  const [nom, setNom] = useState('');
  const page = pages[pageId]!;
  return (
    <div className="grid gap-5">
      <ul className="m-0 grid list-none gap-1 p-0">
        {Object.entries(pages)
          .sort(([, a], [, b]) => a.ordre - b.ordre)
          .map(([id, p]) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChoisir(id)}
                aria-current={id === pageId ? 'page' : undefined}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-control px-3 text-left hover:bg-neutre-100 aria-[current=page]:bg-accent-100"
              >
                <span className="font-semibold">{p.nom}</span>
                <StatusBadge statut={STATUTS_PAGE[p.statut]} />
              </button>
            </li>
          ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (nom.trim()) onAjouter(nom.trim());
          setNom('');
        }}
      >
        <Field label="Nouvelle page" className="min-w-0 flex-1">
          <Input
            value={nom}
            maxLength={80}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nos tarifs"
          />
        </Field>
        <Button type="submit" variant="secondaire" disabled={!nom.trim()}>
          Ajouter
        </Button>
      </form>
      <section aria-labelledby="reglages-page" className="grid gap-3 border-t border-trait pt-4">
        <h3 id="reglages-page" className="m-0 text-lg">
          Page « {page.nom} »
        </h3>
        <Field label="Nom">
          <Input
            value={page.nom}
            maxLength={80}
            onChange={(e) => onRegler({ nom: e.target.value })}
          />
        </Field>
        <Field label="Libellé dans le menu">
          <Input
            value={page.court}
            maxLength={40}
            onChange={(e) => onRegler({ court: e.target.value })}
          />
        </Field>
        <Checkbox checked={page.menu} onChange={(e) => onRegler({ menu: e.target.checked })}>
          Afficher dans le menu
        </Checkbox>
        <Checkbox
          checked={page.statut === 'publiee'}
          disabled={pageId === 'accueil'}
          onChange={(e) => onRegler({ statut: e.target.checked ? 'publiee' : 'brouillon' })}
        >
          Mettre en ligne à la prochaine publication
        </Checkbox>
        {pageId === 'accueil' ? null : (
          <div>
            <Button variant="danger" onClick={() => onSupprimer(pageId)}>
              Supprimer la page
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
