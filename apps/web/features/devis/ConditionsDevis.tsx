'use client';

import { Checkbox, Field, Input, Textarea } from '@ph/ui';
import type { EtatDevis } from './etat';

/** Objet, description, dates, conditions et remise. */
export function ConditionsDevis({
  e,
  maj,
}: {
  e: EtatDevis;
  maj: (patch: Partial<EtatDevis>) => void;
}) {
  return (
    <fieldset className="m-0 grid gap-3 border-0 p-0">
      <legend className="mb-2 text-lg font-bold">Travaux et conditions</legend>
      <Field label="Objet du devis" requis>
        <Input value={e.objet} onChange={(x) => maj({ objet: x.target.value })} />
      </Field>
      <Field
        label="Description"
        aide="Gras, italique, liens et listes sont conservés ; le reste est retiré."
      >
        <Textarea
          rows={4}
          value={e.descriptionHtml}
          onChange={(x) => maj({ descriptionHtml: x.target.value })}
        />
      </Field>
      <div className="grid gap-3 min-[700px]:grid-cols-3">
        <Field label="Valable jusqu’au">
          <Input
            type="date"
            value={e.validiteLe}
            onChange={(x) => maj({ validiteLe: x.target.value })}
          />
        </Field>
        <Field label="Début des travaux">
          <Input
            type="date"
            value={e.debutTravauxLe}
            onChange={(x) => maj({ debutTravauxLe: x.target.value })}
          />
        </Field>
        <Field label="Durée estimée">
          <Input
            value={e.dureeEstimee}
            placeholder="5 jours ouvrés"
            onChange={(x) => maj({ dureeEstimee: x.target.value })}
          />
        </Field>
        <Field label="Frais de déplacement">
          <Input
            value={e.fraisDeplacement}
            onChange={(x) => maj({ fraisDeplacement: x.target.value })}
          />
        </Field>
        <Field label="Remise (%)">
          <Input
            inputMode="decimal"
            value={e.remisePct}
            onChange={(x) => maj({ remisePct: x.target.value })}
          />
        </Field>
        <Field label="Acompte à la signature (%)">
          <Input
            inputMode="decimal"
            value={e.acomptePct}
            onChange={(x) => maj({ acomptePct: x.target.value })}
          />
        </Field>
      </div>
      <Checkbox checked={e.devisGratuit} onChange={(x) => maj({ devisGratuit: x.target.checked })}>
        Devis gratuit
      </Checkbox>
      <Field label="Notes (imprimées sur le devis)">
        <Textarea rows={2} value={e.notes} onChange={(x) => maj({ notes: x.target.value })} />
      </Field>
    </fieldset>
  );
}
