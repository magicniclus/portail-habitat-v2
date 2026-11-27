'use client';

import { DECLENCHEURS_SEQUENCE } from '@ph/core/conversion';
import { Button, IconButton, Input, Select } from '@ph/ui';
import { ArrowDownIcon, ArrowUpIcon, XIcon } from '@phosphor-icons/react';

export interface EtapeSaisie {
  modele: string;
  declencheur: keyof typeof DECLENCHEURS_SEQUENCE;
  valeur?: string | number;
}

/** Étapes d'une séquence : modèle, déclencheur, valeur ; réordonner, retirer, ajouter. */
export function EtapesSequence({
  etapes,
  modeles,
  onChange,
}: {
  etapes: EtapeSaisie[];
  modeles: string[];
  onChange: (e: EtapeSaisie[]) => void;
}) {
  const maj = (i: number, p: Partial<EtapeSaisie>) =>
    onChange(etapes.map((e, j) => (j === i ? { ...e, ...p } : e)));
  const deplacer = (i: number, d: -1 | 1) => {
    const copie = [...etapes];
    [copie[i], copie[i + d]] = [copie[i + d]!, copie[i]!];
    onChange(copie);
  };
  return (
    <fieldset className="m-0 grid gap-3 border-0 p-0">
      <legend className="mb-2 text-sm font-semibold">Étapes</legend>
      <ol className="m-0 grid list-none gap-3 p-0">
        {etapes.map((e, i) => (
          <li key={i} className="grid gap-2 rounded-lg border border-trait p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <Select
                aria-label={`Modèle de l’étape ${i + 1}`}
                value={e.modele}
                onChange={(ev) => maj(i, { modele: ev.target.value })}
              >
                {modeles.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
              <Select
                aria-label={`Déclencheur de l’étape ${i + 1}`}
                value={e.declencheur}
                onChange={(ev) =>
                  maj(i, { declencheur: ev.target.value as EtapeSaisie['declencheur'] })
                }
              >
                {Object.entries(DECLENCHEURS_SEQUENCE).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
              {e.declencheur === 'delai' ? (
                <Input
                  aria-label={`Jours avant l’étape ${i + 1}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={365}
                  value={e.valeur ?? 0}
                  onChange={(ev) => maj(i, { valeur: Number(ev.target.value) })}
                  className="sm:w-24"
                />
              ) : null}
            </div>
            <div className="flex gap-1">
              <IconButton
                aria-label="Monter"
                disabled={i === 0}
                onClick={() => deplacer(i, -1)}
                icone={<ArrowUpIcon />}
              />
              <IconButton
                aria-label="Descendre"
                disabled={i === etapes.length - 1}
                onClick={() => deplacer(i, 1)}
                icone={<ArrowDownIcon />}
              />
              <IconButton
                aria-label="Retirer l’étape"
                disabled={etapes.length === 1}
                onClick={() => onChange(etapes.filter((_, j) => j !== i))}
                icone={<XIcon />}
              />
            </div>
          </li>
        ))}
      </ol>
      <div>
        <Button
          variant="secondaire"
          onClick={() =>
            onChange([...etapes, { modele: modeles[0] ?? '', declencheur: 'delai', valeur: 3 }])
          }
        >
          + Ajouter une étape
        </Button>
      </div>
    </fieldset>
  );
}
