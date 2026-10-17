'use client';

import {
  insererCopieSection,
  insererElement,
  insererSectionPrete,
  LIBELLES_ELEMENT,
  SECTIONS_PRETES,
  type PageSite,
  type TypeElement,
} from '@ph/core/sites';
import { MesSections } from './MesSections';

const nouvelId = () => Math.random().toString(36).slice(2, 10);
const carte =
  'grid min-h-11 content-start gap-0.5 rounded-[10px] border border-trait bg-blanc p-3 text-left hover:border-accent-300 focus-visible:outline-2';

/**
 * Ajouter (SITE_INTERNET §4.1) : les 16 éléments, placés après la sélection (ou dans une nouvelle
 * section en bas de page), « Mes sections » et les 12 sections prêtes, insérées après la section
 * sélectionnée.
 */
export function PanneauAjout({
  page,
  selection,
  onPage,
  onElement,
}: {
  page: PageSite;
  /** Élément sélectionné dans Calques ou l'aperçu. */
  selection: string | null;
  onPage: (p: PageSite) => void;
  /** Élément ajouté : ses réglages s'ouvrent. */
  onElement: (id: string) => void;
}) {
  const sectionSelectionnee =
    page.sections.find((s) =>
      s.rows.some((r) => r.cols.some((c) => c.els.some((e) => e.id === selection))),
    )?.id ?? null;
  const ajouterElement = (type: TypeElement) => {
    const r = insererElement(page, selection, type, nouvelId);
    onPage(r.page);
    onElement(r.id);
  };
  const ajouterSection = (cle: string) => {
    const r = insererSectionPrete(page, cle, sectionSelectionnee, nouvelId);
    if (r) onPage(r.page);
  };
  return (
    <div className="grid gap-5">
      <section aria-labelledby="ajout-elements" className="grid gap-2">
        <h2 id="ajout-elements" className="m-0 text-base">
          Éléments
        </h2>
        <p className="m-0 text-sm text-neutre-700">
          {selection
            ? 'Ajouté juste après l’élément sélectionné.'
            : 'Ajouté dans une nouvelle section, en bas de la page.'}
        </p>
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
          {(Object.keys(LIBELLES_ELEMENT) as TypeElement[]).map((t) => (
            <li key={t}>
              <button type="button" className={`${carte} w-full`} onClick={() => ajouterElement(t)}>
                <span className="font-semibold">{LIBELLES_ELEMENT[t]}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <MesSections
        carte={carte}
        onInserer={(x) =>
          onPage(insererCopieSection(page, x.section, sectionSelectionnee, nouvelId))
        }
      />
      <section aria-labelledby="ajout-sections" className="grid gap-2">
        <h2 id="ajout-sections" className="m-0 text-base">
          Sections prêtes
        </h2>
        <ul className="m-0 grid list-none gap-2 p-0">
          {SECTIONS_PRETES.map((s) => (
            <li key={s.cle}>
              <button
                type="button"
                className={`${carte} w-full`}
                onClick={() => ajouterSection(s.cle)}
              >
                <span className="font-semibold">{s.nom}</span>
                <span className="text-sm text-neutre-700">{s.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
