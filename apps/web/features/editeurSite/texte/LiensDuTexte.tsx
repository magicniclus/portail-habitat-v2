'use client';

import { motsLies, TUILES_ACTION, type Action } from '@ph/core/sites';
import { XIcon } from '@phosphor-icons/react';
import { ChampAction } from '../ChampAction';
import type { ContexteReglages } from '../proprietes/contexte';

/** Liens d'un texte : chaque mot lié, sa destination (tuiles d'action) et son retrait. */
export function LiensDuTexte({
  texte,
  liens,
  c,
  ouvert,
  onOuvert,
  onChange,
  onRetirer,
}: {
  texte: string;
  liens: Record<string, Action>;
  c: ContexteReglages;
  ouvert: string | null;
  onOuvert: (lid: string | null) => void;
  onChange: (p: { texte: string; liens: Record<string, Action> }) => void;
  onRetirer: (lid: string) => void;
}) {
  const mots = motsLies(texte);
  if (!mots.length) return null;
  const decrire = (a: Action | undefined) =>
    !a
      ? 'Aucune action'
      : a.type === 'page' && a.page
        ? `Page · ${c.pages[a.page]?.nom ?? '?'}`
        : TUILES_ACTION[a.type];
  return (
    <div className="grid gap-1.5 [grid-template-columns:minmax(0,1fr)]">
      <span className="text-xs font-bold text-neutre-700">Liens dans ce texte</span>
      {mots.map(({ mot, lid }) => {
        const a = liens[lid];
        return (
          <div
            key={lid}
            className="grid gap-1.5 rounded-[8px] border border-trait p-2 [grid-template-columns:minmax(0,1fr)]"
          >
            <div className="flex items-center gap-1">
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">« {mot} »</span>
              <button
                type="button"
                aria-label={`Retirer le lien « ${mot} »`}
                title="Retirer le lien (garder le texte)"
                onClick={() => onRetirer(lid)}
                className="grid size-11 place-items-center rounded-[6px] text-neutre-700 hover:bg-neutre-100"
              >
                <XIcon size={14} aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              aria-expanded={ouvert === lid}
              onClick={() => onOuvert(ouvert === lid ? null : lid)}
              className={`min-h-11 rounded-[6px] border px-2 text-left text-xs ${a && c.erreurAction(a) ? 'border-danger text-danger' : 'border-trait text-neutre-800'}`}
            >
              {decrire(a)}
            </button>
            {ouvert === lid ? (
              <ChampAction
                libelle={`Lien « ${mot} »`}
                action={a ?? { type: 'aucun' }}
                onChange={(x) => onChange({ texte, liens: { ...liens, [lid]: x } })}
                c={c}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
