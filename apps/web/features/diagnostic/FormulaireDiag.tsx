'use client';

import { Button, Field, Select } from '@ph/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { routes } from '@/lib/routes';
import { MOTIFS, PERIODES, TYPES } from './contenu';

/** Formulaire du hero : préremplit le parcours diagnostic (`?motif&type&periode`, DIA-01). */
export function FormulaireDiag() {
  const router = useRouter();
  const envoyer = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const q = new URLSearchParams({
      motif: String(f.get('motif')),
      type: String(f.get('type')),
      periode: String(f.get('periode')),
    });
    router.push(`${routes.diagnosticEstimation}?${q}` as Route);
  };
  const champs = [
    { nom: 'motif', label: 'Je veux', options: MOTIFS },
    { nom: 'type', label: 'Un bien', options: TYPES },
    { nom: 'periode', label: 'Construit', options: PERIODES },
  ] as const;
  return (
    <form
      onSubmit={envoyer}
      aria-label="Voir mes diagnostics obligatoires"
      className="grid gap-3 rounded-[16px] bg-blanc p-[18px] shadow-md"
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {champs.map((c) => (
          <Field key={c.nom} label={c.label}>
            <Select name={c.nom} className="min-h-12">
              {c.options.map((o) => (
                <option key={o.valeur} value={o.valeur}>
                  {o.libelle}
                </option>
              ))}
            </Select>
          </Field>
        ))}
      </div>
      <Button type="submit" taille="lg" pleineLargeur className="min-h-[52px]">
        Voir mes diagnostics obligatoires
      </Button>
      <p className="m-0 text-center text-[13px] text-neutre-700">
        Gratuit · sans création de compte · 2 minutes
      </p>
    </form>
  );
}
