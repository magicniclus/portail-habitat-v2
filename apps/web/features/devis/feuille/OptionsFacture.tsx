'use client';

import { Field, Input, Textarea } from '@ph/ui';
import type { EtatDevis } from '../etat';

/** Options › Paiement et Infos complémentaires d'une facture sans devis. */
export function OptionsFacture({
  e,
  maj,
  delaiPaiementJours,
}: {
  e: EtatDevis;
  maj: (patch: Partial<EtatDevis>) => void;
  delaiPaiementJours: number;
}) {
  const libre = e.champLibre ?? { titre: '', texte: '' };
  return (
    <fieldset className="m-0 grid gap-2 border-0 p-0">
      <legend className="mb-2 text-[15px] font-semibold">Paiement et infos complémentaires</legend>
      <p className="m-0 text-sm text-neutre-700">
        Échéance à {delaiPaiementJours} jours (réglée dans Paramètres).
      </p>
      <Field label="Remise globale (%)">
        <Input
          inputMode="decimal"
          value={e.remisePct}
          onChange={(x) => maj({ remisePct: x.target.value })}
        />
      </Field>
      <Field label="Champ libre : titre">
        <Input
          value={libre.titre}
          onChange={(x) => maj({ champLibre: { ...libre, titre: x.target.value } })}
        />
      </Field>
      <Field label="Champ libre : texte">
        <Textarea
          rows={2}
          value={libre.texte}
          onChange={(x) => maj({ champLibre: { ...libre, texte: x.target.value } })}
        />
      </Field>
    </fieldset>
  );
}
