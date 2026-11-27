'use client';

import { useRouter } from 'next/navigation';

/** Tri des résultats (natif, MOBILE §5) : l'URL change, la page serveur recalcule l'ordre. */
export function SelectTri({
  valeur,
  options,
  base,
}: {
  valeur: string;
  options: { v: string; libelle: string }[];
  /** Requête sans le tri (`?metier=…`), à compléter. */
  base: string;
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2.5 text-sm">
      <span className="text-neutre-800">Trier par</span>
      <select
        value={valeur}
        onChange={(e) => {
          const p = new URLSearchParams(base);
          if (e.target.value === 'pertinence') p.delete('tri');
          else p.set('tri', e.target.value);
          const qs = p.toString();
          router.replace(`/artisans${qs ? `?${qs}` : ''}` as Parameters<typeof router.replace>[0], {
            scroll: false,
          });
        }}
        className="min-h-11 cursor-pointer rounded-[10px] border border-neutre-400 bg-blanc px-2.5 text-base"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.libelle}
          </option>
        ))}
      </select>
    </label>
  );
}
