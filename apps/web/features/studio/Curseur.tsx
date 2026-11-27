'use client';

/** Réglage à curseur de l'éditeur (libellé, valeur lisible, double-clic = valeur neutre). */
export function Curseur(p: {
  libelle: string;
  valeur: number;
  min: number;
  max: number;
  pas: number;
  neutre: number;
  affichage: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="flex justify-between text-montage-texte-doux">
        {p.libelle}
        <span className="text-montage-texte tabular-nums">{p.affichage(p.valeur)}</span>
      </span>
      <input
        type="range"
        min={p.min}
        max={p.max}
        step={p.pas}
        value={p.valeur}
        onChange={(e) => p.onChange(Number(e.target.value))}
        onDoubleClick={() => p.onChange(p.neutre)}
        className="h-6 w-full accent-montage-selection"
      />
    </label>
  );
}

export const pourcent = (v: number) => `${Math.round(v * 100)} %`;
export const decibels = (v: number) => `${v > 0 ? '+' : ''}${v} dB`;
export const secondes = (v: number) => `${(v / 1000).toFixed(1)} s`;

/** Case à cocher de l'éditeur sombre (cible de 44 px). */
export function Interrupteur(p: {
  libelle: string;
  coche: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={p.coche}
        onChange={(e) => p.onChange(e.target.checked)}
        className="size-4 accent-montage-selection"
      />
      {p.libelle}
    </label>
  );
}
