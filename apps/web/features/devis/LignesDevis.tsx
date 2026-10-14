'use client';

import { TAUX_TVA, type TauxTva } from '@ph/core/devis';
import { Button, Field, Input, Select } from '@ph/ui';
import { ligneVide, type LigneSaisie } from './etat';

/** Lignes du devis : désignation, quantité, unité, PU HT, TVA et coût (privé, pour la marge). */
export function LignesDevis({
  lignes,
  tvaDefaut,
  onChange,
}: {
  lignes: LigneSaisie[];
  tvaDefaut: TauxTva;
  onChange: (l: LigneSaisie[]) => void;
}) {
  const maj = (i: number, patch: Partial<LigneSaisie>) =>
    onChange(lignes.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <fieldset className="m-0 grid gap-3 border-0 p-0">
      <legend className="mb-2 text-lg font-bold">Prestations</legend>
      {lignes.map((l, i) => (
        <div
          key={l.cle}
          role="group"
          aria-label={`Ligne ${i + 1}`}
          className="grid gap-3 rounded-[12px] border border-trait p-3 min-[900px]:grid-cols-[minmax(0,3fr)_90px_90px_120px_100px_110px_auto] min-[900px]:items-end"
        >
          <Field label="Désignation">
            <Input
              value={l.designation}
              onChange={(e) => maj(i, { designation: e.target.value })}
            />
          </Field>
          <Field label="Quantité">
            <Input
              inputMode="decimal"
              value={l.quantite}
              onChange={(e) => maj(i, { quantite: e.target.value })}
            />
          </Field>
          <Field label="Unité">
            <Input value={l.unite} onChange={(e) => maj(i, { unite: e.target.value })} />
          </Field>
          <Field label="PU HT (€)">
            <Input
              inputMode="decimal"
              value={l.puHt}
              onChange={(e) => maj(i, { puHt: e.target.value })}
            />
          </Field>
          <Field label="TVA">
            <Select
              value={String(l.tva)}
              onChange={(e) => maj(i, { tva: Number(e.target.value) as TauxTva })}
            >
              {TAUX_TVA.map((t) => (
                <option key={t} value={t}>
                  {String(t).replace('.', ',')} %
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Coût HT (privé)">
            <Input
              inputMode="decimal"
              value={l.cout}
              onChange={(e) => maj(i, { cout: e.target.value })}
            />
          </Field>
          <Button
            variant="fantome"
            onClick={() => onChange(lignes.filter((_, j) => j !== i))}
            disabled={lignes.length === 1}
            aria-label={`Supprimer la ligne ${i + 1}`}
          >
            Supprimer
          </Button>
        </div>
      ))}
      <div>
        <Button variant="secondaire" onClick={() => onChange([...lignes, ligneVide(tvaDefaut)])}>
          + Ajouter une ligne
        </Button>
      </div>
    </fieldset>
  );
}
