'use client';

import { Field, Input, Select } from '@ph/ui';
import { TrashIcon } from '@phosphor-icons/react';

export interface ThemeSession {
  theme: string;
  nombre: number;
}

const THEMES_MAX = 5;

/** Thèmes de la session : chacun son nombre de vidéos (1 à 10), accroches différentes. */
export function ThemesSession(p: {
  themes: ThemeSession[];
  onChange: (t: ThemeSession[]) => void;
  desactive: boolean;
}) {
  const changer = (i: number, champs: Partial<ThemeSession>) =>
    p.onChange(p.themes.map((x, j) => (j === i ? { ...x, ...champs } : x)));
  return (
    <div className="grid gap-2">
      {p.themes.map((x, i) => (
        <div key={i} className="grid items-end gap-2 md:grid-cols-[1fr_150px_auto]">
          <Field label={`Thème ${i + 1}${i === 0 ? ' (facultatif)' : ''}`}>
            <Input
              value={x.theme}
              maxLength={200}
              disabled={p.desactive}
              onChange={(e) => changer(i, { theme: e.target.value })}
              placeholder="Ex. les demandes gratuites, le devis en 2 minutes"
            />
          </Field>
          <Field label={`Vidéos du thème ${i + 1}`}>
            <Select
              value={x.nombre}
              disabled={p.desactive}
              onChange={(e) => changer(i, { nombre: Number(e.target.value) })}
            >
              {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => (
                <option key={n} value={n}>
                  {n} vidéo{n > 1 ? 's' : ''}
                </option>
              ))}
            </Select>
          </Field>
          {p.themes.length > 1 ? (
            <button
              type="button"
              disabled={p.desactive}
              aria-label={`Retirer le thème ${i + 1}`}
              onClick={() => p.onChange(p.themes.filter((_, j) => j !== i))}
              className="grid size-11 place-items-center rounded-control border border-trait hover:bg-neutre-100"
            >
              <TrashIcon size={18} aria-hidden="true" />
            </button>
          ) : (
            <span />
          )}
        </div>
      ))}
      {p.themes.length < THEMES_MAX ? (
        <div>
          <button
            type="button"
            disabled={p.desactive}
            onClick={() => p.onChange([...p.themes, { theme: '', nombre: 5 }])}
            className="inline-flex min-h-11 items-center rounded-control border border-trait px-4 text-sm font-semibold hover:bg-neutre-100"
          >
            + Ajouter un thème
          </button>
        </div>
      ) : null}
    </div>
  );
}
