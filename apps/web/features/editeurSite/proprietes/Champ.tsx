'use client';

/** Champ de texte du panneau (une ligne, ou plusieurs avec `long`). */
export function Champ({
  libelle,
  valeur,
  onChange,
  long,
}: {
  libelle: string;
  valeur: string;
  onChange: (v: string) => void;
  long?: boolean;
}) {
  const cls = 'min-h-11 rounded-[8px] border border-trait px-3 py-2 text-base';
  return (
    <label className="grid gap-1.5 text-[13px] font-bold text-neutre-800">
      {libelle}
      {long ? (
        <textarea
          rows={4}
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      ) : (
        <input value={valeur} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </label>
  );
}
