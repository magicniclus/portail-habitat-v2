'use client';

import { LIBELLES_ELEMENT, type Element, type PageSite } from '@ph/core/sites';
import { Button } from '@ph/ui';

const extrait = (e: Element) => {
  const p = e.p as Record<string, unknown>;
  const t = String(p.texte ?? p.label ?? p.nom ?? p.legende ?? '')
    .replace(/\[([^\]]+)\]\(#L\d+\)/g, '$1')
    .replace(/<\/?[biu]>/g, '');
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
};

/** Calques : sections (monter, descendre, dupliquer, supprimer) et leurs éléments à sélectionner. */
export function PanneauCalques({
  page,
  onSection,
  onSelection,
}: {
  page: PageSite;
  onSection: (id: string, op: 'haut' | 'bas' | 'dupliquer' | 'supprimer') => void;
  onSelection: (id: string) => void;
}) {
  return (
    <ol className="m-0 grid list-none gap-3 p-0">
      {page.sections.map((s, i) => (
        <li key={s.id} className="grid gap-2 rounded-[12px] border border-trait p-3">
          <strong>{s.p.nom || `Section ${i + 1}`}</strong>
          <div className="flex flex-wrap gap-1">
            <Button
              variant="fantome"
              taille="sm"
              disabled={i === 0}
              onClick={() => onSection(s.id, 'haut')}
              aria-label={`Monter ${s.p.nom}`}
            >
              ↑
            </Button>
            <Button
              variant="fantome"
              taille="sm"
              disabled={i === page.sections.length - 1}
              onClick={() => onSection(s.id, 'bas')}
              aria-label={`Descendre ${s.p.nom}`}
            >
              ↓
            </Button>
            <Button variant="fantome" taille="sm" onClick={() => onSection(s.id, 'dupliquer')}>
              Dupliquer
            </Button>
            <Button variant="fantome" taille="sm" onClick={() => onSection(s.id, 'supprimer')}>
              Supprimer
            </Button>
          </div>
          <ul className="m-0 grid list-none gap-1 p-0">
            {s.rows.flatMap((r) =>
              r.cols.flatMap((c) =>
                c.els.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onSelection(e.id)}
                      className="flex min-h-11 w-full items-center gap-2 rounded-control px-2 text-left hover:bg-neutre-100"
                    >
                      <span className="font-semibold">{LIBELLES_ELEMENT[e.type]}</span>
                      <span className="truncate text-sm text-neutre-800">{extrait(e)}</span>
                    </button>
                  </li>
                )),
              ),
            )}
          </ul>
        </li>
      ))}
    </ol>
  );
}
