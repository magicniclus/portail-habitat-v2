'use client';

import type { Niveau } from '@ph/core/dessin';
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsHorizontalIcon,
  ArrowsVerticalIcon,
  ArrowUpIcon,
  MagicWandIcon,
} from '@phosphor-icons/react';
import type { ReactNode } from 'react';

type Toiture = NonNullable<Niveau['toiture']>;
export type Sens = NonNullable<Toiture['sens']>;
export type Descente = NonNullable<Toiture['descente']>;

export const LIBELLES_SENS: Record<Sens, string> = {
  horizontal: 'Faîtage horizontal',
  vertical: 'Faîtage vertical',
};
export const LIBELLES_DESCENTE: Record<Descente, string> = {
  haut: 'Descend vers le haut',
  bas: 'Descend vers le bas',
  gauche: 'Descend vers la gauche',
  droite: 'Descend vers la droite',
};

const bouton =
  'flex min-h-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[10px] border px-1 text-xs font-semibold font-[inherit] text-texte';

function Choix<T extends string>({
  options,
  actif,
  choisir,
}: {
  options: [T | null, string, ReactNode][];
  actif: T | null;
  choisir: (v: T | null) => void;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(([v, libelle, icone]) => (
        <button
          key={libelle}
          type="button"
          aria-pressed={actif === v}
          onClick={() => choisir(v)}
          className={`${bouton} ${actif === v ? 'border-accent bg-accent-100' : 'border-neutre-300 bg-blanc'}`}
        >
          <span aria-hidden="true" className="text-base leading-none">
            {icone}
          </span>
          {libelle}
        </button>
      ))}
    </div>
  );
}

/**
 * Sens du toit (DES-16), choisi sur le plan : faîtage à l'horizontale ou à la verticale, ou côté
 * bas d'un monopente. « Auto » laisse le logiciel le placer le long de chaque partie.
 */
export function SensToit({
  toiture,
  orienter,
}: {
  toiture: Toiture;
  orienter: (o: { sens?: Sens | null; descente?: Descente | null }) => void;
}) {
  if (toiture.type === 'plate') return null;
  const mono = toiture.type === 'monopente';
  return (
    <fieldset className="m-0 grid gap-2 border-0 p-0">
      <legend className="mb-1 px-1 text-[13px] font-semibold">
        {mono ? 'Le toit descend vers' : 'Sens du faîtage'}
      </legend>
      {mono ? (
        <Choix<Descente>
          actif={toiture.descente ?? null}
          choisir={(descente) => orienter({ descente })}
          options={[
            [null, 'Auto', <MagicWandIcon key="a" />],
            ['haut', 'Haut', <ArrowUpIcon key="h" />],
            ['bas', 'Bas', <ArrowDownIcon key="b" />],
            ['gauche', 'Gauche', <ArrowLeftIcon key="g" />],
            ['droite', 'Droite', <ArrowRightIcon key="d" />],
          ]}
        />
      ) : (
        <Choix<Sens>
          actif={toiture.sens ?? null}
          choisir={(sens) => orienter({ sens })}
          options={[
            [null, 'Auto', <MagicWandIcon key="a" />],
            ['horizontal', 'Horizontal', <ArrowsHorizontalIcon key="h" />],
            ['vertical', 'Vertical', <ArrowsVerticalIcon key="v" />],
          ]}
        />
      )}
    </fieldset>
  );
}
