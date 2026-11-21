'use client';

import type { Action } from '@ph/core/sites';
import type { ContexteReglages } from '../proprietes/contexte';

export const sansAncre = ({ ancre: _a, ...reste }: Action): Action => reste;

/**
 * Zone d'arrivée d'un lien (« Arriver directement sur une zone ») : choisir une zone qui n'a pas
 * encore d'ancre lui en donne une, tirée de son nom.
 */
export function ChoixZone({
  libelle,
  pageId,
  action: a,
  onChange,
  c,
  vide,
}: {
  libelle: string;
  pageId: string;
  action: Action;
  onChange: (a: Action) => void;
  c: Pick<ContexteReglages, 'pages' | 'ancrerZone'>;
  vide: string;
}) {
  const p = c.pages[pageId];
  if (!p) return null;
  const actuelle = p.sections.find((s) => s.p.ancre && s.p.ancre === a.ancre)?.id ?? '';
  return (
    <label className="grid gap-1.5 text-[13px] font-bold text-neutre-800">
      {libelle}
      <select
        value={actuelle}
        onChange={(e) => {
          const ancre = e.target.value ? c.ancrerZone(pageId, e.target.value) : null;
          onChange(ancre ? { ...a, ancre } : sansAncre(a));
        }}
        className="min-h-11 w-full rounded-[8px] border border-trait bg-blanc px-3 text-base font-normal"
      >
        <option value="">{vide}</option>
        {p.sections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.p.nom || 'Zone sans nom'}
            {s.p.ancre ? ` (#${s.p.ancre})` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
