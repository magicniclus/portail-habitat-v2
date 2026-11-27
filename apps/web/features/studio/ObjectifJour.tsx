'use client';

import { Field, Select } from '@ph/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';

/** Objectif de vidéos par jour (dans l'adresse : rien d'enregistré, chacun règle sa vue). */
export function ObjectifJour({ valeur }: { valeur: number }) {
  const router = useRouter();
  return (
    <Field label="Objectif par jour">
      <Select
        value={valeur}
        onChange={(e) => router.push(`/admin/studio/calendrier?parJour=${e.target.value}` as Route)}
        className="w-auto"
      >
        {[1, 2, 3, 5, 10, 20, 30].map((n) => (
          <option key={n} value={n}>
            {n} vidéo{n > 1 ? 's' : ''}
          </option>
        ))}
      </Select>
    </Field>
  );
}
