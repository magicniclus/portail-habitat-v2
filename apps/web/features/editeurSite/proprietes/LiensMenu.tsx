'use client';

import { deplacer, LIBELLES_ACTION, type Action, type Navigation } from '@ph/core/sites';
import { ArrowDownIcon, ArrowUpIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { ChampAction } from '../ChampAction';
import type { ContexteReglages } from './contexte';

const bouton =
  'grid size-11 place-items-center rounded-[8px] text-neutre-700 hover:bg-neutre-100 disabled:opacity-40';

/** Liens du menu : renommer, ordonner, retirer, et destination de chacun (maquette). */
export function LiensMenu({
  nav,
  c,
  onChange,
}: {
  nav: Navigation;
  c: ContexteReglages;
  onChange: (n: Navigation) => void;
}) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const liens = nav.liens;
  const maj = (l: Navigation['liens']) => onChange({ ...nav, liens: l });
  const decrire = (a: Action) =>
    a.type === 'page' && a.page
      ? (c.pages[a.page]?.nom ?? 'Page supprimée')
      : LIBELLES_ACTION[a.type];
  return (
    <div className="grid gap-2 [grid-template-columns:minmax(0,1fr)]">
      {liens.map((l, i) => (
        <div
          key={l.id}
          className="grid gap-1.5 rounded-[10px] border border-trait p-2 [grid-template-columns:minmax(0,1fr)]"
        >
          <div className="flex items-center gap-1">
            <label className="sr-only" htmlFor={`lien-${l.id}`}>
              Texte du lien {i + 1}
            </label>
            <input
              id={`lien-${l.id}`}
              value={l.label}
              maxLength={40}
              onChange={(e) =>
                maj(liens.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
              }
              className="min-h-11 w-0 min-w-0 flex-1 rounded-[8px] border border-trait px-3 text-base"
            />
            <button
              type="button"
              aria-label={`Monter ${l.label}`}
              disabled={i === 0}
              onClick={() => maj(deplacer(liens, i, -1))}
              className={bouton}
            >
              <ArrowUpIcon size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Descendre ${l.label}`}
              disabled={i === liens.length - 1}
              onClick={() => maj(deplacer(liens, i, 1))}
              className={bouton}
            >
              <ArrowDownIcon size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Retirer ${l.label}`}
              onClick={() => maj(liens.filter((_, j) => j !== i))}
              className={bouton}
            >
              <XIcon size={16} aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            aria-expanded={ouvert === l.id}
            onClick={() => setOuvert(ouvert === l.id ? null : l.id)}
            className={`min-h-11 rounded-[8px] px-2 text-left text-[13px] font-semibold ${c.erreurAction(l.action) ? 'text-danger' : 'text-accent-800'} hover:bg-neutre-100`}
          >
            → {decrire(l.action)}
          </button>
          {ouvert === l.id ? (
            <ChampAction
              action={l.action}
              onChange={(action) => maj(liens.map((x, j) => (j === i ? { ...x, action } : x)))}
              pages={c.pages}
              erreur={c.erreurAction(l.action)}
              libelle="Destination"
            />
          ) : null}
        </div>
      ))}
      <button
        type="button"
        disabled={liens.length >= 12}
        onClick={() => {
          const id = `l${Date.now().toString(36)}`;
          maj([...liens, { id, label: 'Nouveau lien', action: { type: 'page', page: 'accueil' } }]);
          setOuvert(id);
        }}
        className="min-h-11 rounded-[10px] border border-dashed border-neutre-400 text-[13px] font-semibold text-neutre-800 hover:bg-neutre-100"
      >
        + Ajouter un lien
      </button>
    </div>
  );
}
