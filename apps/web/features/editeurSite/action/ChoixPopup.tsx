'use client';

import type { Action } from '@ph/core/sites';
import { Info } from '../proprietes/controles';
import type { ContexteReglages } from '../proprietes/contexte';

const champ = 'min-h-11 w-full rounded-[8px] border border-trait bg-blanc px-3 text-base';

/** Action « Pop-up » : fenêtre à ouvrir parmi les zones en pop-up de la page. */
export function ChoixPopup({
  action: a,
  onChange,
  c,
}: {
  action: Action;
  onChange: (a: Action) => void;
  c: ContexteReglages;
}) {
  const popups = (c.pages[c.pageId]?.sections ?? []).filter((s) => s.p.popup && s.p.ancre);
  if (!popups.length)
    return (
      <Info>
        Aucune fenêtre pop-up sur cette page. Sélectionnez une zone, onglet Avancé, puis activez «
        Afficher cette zone en fenêtre pop-up ».
      </Info>
    );
  return (
    <label className="grid gap-1.5 text-[13px] font-bold text-neutre-800">
      Fenêtre à ouvrir
      <select
        value={a.ancre ?? ''}
        onChange={(e) => onChange({ type: 'popup', ancre: e.target.value })}
        className={champ}
      >
        <option value="">Choisir…</option>
        {popups.map((s) => (
          <option key={s.id} value={s.p.ancre}>
            {s.p.nom || s.p.ancre}
          </option>
        ))}
      </select>
    </label>
  );
}
