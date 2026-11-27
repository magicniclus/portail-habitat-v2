'use client';

import { Select } from '@ph/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';

/** Choix de la page analysée (liste native, mobile d'abord). */
export function ChoixPage({
  valeur,
  options,
  liens,
}: {
  valeur: string;
  options: { id: string; nom: string }[];
  liens: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Page analysée</span>
      <Select
        value={valeur}
        onChange={(e) => router.push(liens[e.target.value] as Route)}
        className="min-w-[260px]"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nom}
          </option>
        ))}
      </Select>
    </label>
  );
}
