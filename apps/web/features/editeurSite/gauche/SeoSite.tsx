'use client';

import type { PageSite } from '@ph/core/sites';
import { Button } from '@ph/ui';

const AUTOMATIQUE = [
  'Plan du site (sitemap.xml) et robots.txt à jour à chaque publication',
  'Adresse canonique sur chaque page',
  'Données structurées de votre entreprise',
  'Site sécurisé (HTTPS) et adapté au mobile',
  'Images en WebP avec texte alternatif',
];

/** Référencement « Tout le site » : informations communes, ce qui est automatique, score par page. */
export function SeoSite({
  pages,
  hote,
  nomSite,
  ville,
  score,
  onPage,
  onIa,
}: {
  pages: Record<string, PageSite>;
  hote: string;
  nomSite: string;
  ville?: string;
  score: (p: PageSite) => number;
  onPage: (id: string) => void;
  onIa: () => void;
}) {
  return (
    <>
      <div className="grid gap-1.5 rounded-[10px] border border-trait p-3 text-[13px]">
        <strong>Pour tout le site</strong>
        <span>
          <span className="text-neutre-600">Nom du site : </span>
          {nomSite}
        </span>
        <span>
          <span className="text-neutre-600">Zone desservie : </span>
          {ville ?? 'à renseigner sur votre fiche'}
        </span>
        <span>
          <span className="text-neutre-600">Adresse : </span>
          {hote}
        </span>
        <span className="text-xs text-neutre-600">
          Le nom se change dans la navigation, la zone sur votre fiche Portail Travaux.
        </span>
      </div>
      <div className="grid gap-1.5">
        <strong className="text-[13px]">Automatique</strong>
        <ul className="m-0 grid list-none gap-1 p-0 text-[13px]">
          {AUTOMATIQUE.map((t) => (
            <li key={t} className="flex gap-2">
              <span aria-hidden="true" className="text-succes">
                ✓
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
      <ul className="m-0 grid list-none gap-1 p-0">
        {Object.entries(pages)
          .sort(([, a], [, b]) => a.ordre - b.ordre)
          .map(([id, p]) => {
            const s = score(p);
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onPage(id)}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[8px] px-2 text-left text-sm hover:bg-neutre-100"
                >
                  <span className="truncate font-semibold">{p.nom}</span>
                  <span className={s >= 80 ? 'font-bold text-succes' : 'font-bold text-neutre-800'}>
                    {s}/100
                  </span>
                </button>
              </li>
            );
          })}
      </ul>
      <Button onClick={onIa}>Optimiser toutes les pages</Button>
    </>
  );
}
