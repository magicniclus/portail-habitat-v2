'use client';

import type { Theme } from '@ph/core/sites';
import { Field, RadioCard, RadioCardGroup, Select } from '@ph/ui';
import { palettesSites } from '@ph/ui/tokens';

const POLICES: Record<Theme['polices'], string> = {
  archivo: 'Moderne (Archivo)',
  dmserif: 'Élégante (DM Serif)',
  barlow: 'Chantier (Barlow)',
};

/** Styles du site : palette parmi les 6 proposées, polices, forme des boutons. */
export function PanneauStyles({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className="grid gap-4">
      <RadioCardGroup legende="Couleurs">
        {palettesSites.map(({ nom, ...p }) => (
          <RadioCard
            key={nom}
            name="palette"
            checked={theme.palette.primaire === p.primaire && theme.palette.accent === p.accent}
            onChange={() => onChange({ ...theme, palette: p })}
            titre={
              <span className="flex items-center gap-2">
                {[p.primaire, p.accent, p.clair, p.sombre].map((c) => (
                  <span
                    key={c}
                    aria-hidden="true"
                    className="size-5 rounded-full ring-1 ring-trait"
                    style={{ background: c }}
                  />
                ))}
                {nom}
              </span>
            }
          />
        ))}
      </RadioCardGroup>
      <Field label="Polices">
        <Select
          value={theme.polices}
          onChange={(e) => onChange({ ...theme, polices: e.target.value as Theme['polices'] })}
        >
          {Object.entries(POLICES).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Boutons">
        <Select
          value={String(theme.rayonBoutons)}
          onChange={(e) =>
            onChange({ ...theme, rayonBoutons: Number(e.target.value) as Theme['rayonBoutons'] })
          }
        >
          <option value="2">Carrés</option>
          <option value="8">Arrondis</option>
          <option value="999">Pilule</option>
        </Select>
      </Field>
    </div>
  );
}
