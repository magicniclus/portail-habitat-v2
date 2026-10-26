'use client';

import { Checkbox, Field, Input, Textarea } from '@ph/ui';
import type { EtatDevis } from '../etat';

/** Options › Travaux, Paiement et Infos complémentaires. */
export function OptionsConditions({
  e,
  maj,
  avecCout,
  onAvecCout,
}: {
  e: EtatDevis;
  maj: (patch: Partial<EtatDevis>) => void;
  avecCout: boolean;
  onAvecCout: (v: boolean) => void;
}) {
  const libre = e.champLibre ?? { titre: '', texte: '' };
  return (
    <>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-2 text-[15px] font-semibold">Travaux et paiement</legend>
        <div className="grid grid-cols-2 gap-2">
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
          <Field label="Acompte (%)">
            <Input
              inputMode="decimal"
              value={e.acomptePct}
              onChange={(x) => maj({ acomptePct: x.target.value })}
            />
          </Field>
          <Field label="Remise globale (%)">
            <Input
              inputMode="decimal"
              value={e.remisePct}
              onChange={(x) => maj({ remisePct: x.target.value })}
            />
          </Field>
        </div>
        <Field label="Frais de déplacement">
          <Input
            value={e.fraisDeplacement}
            onChange={(x) => maj({ fraisDeplacement: x.target.value })}
          />
        </Field>
        <Checkbox
          checked={e.devisGratuit}
          onChange={(x) => maj({ devisGratuit: x.target.checked })}
        >
          Devis gratuit
        </Checkbox>
        <Checkbox checked={avecCout} onChange={(x) => onAvecCout(x.target.checked)}>
          Saisir mes coûts d’achat (marge, jamais imprimée)
        </Checkbox>
      </fieldset>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-2 text-[15px] font-semibold">Infos complémentaires</legend>
        <Field label="Intitulé du document" aide="« Devis » par défaut.">
          <Input
            value={e.intitule ?? ''}
            placeholder="Devis"
            onChange={(x) => maj({ intitule: x.target.value })}
          />
        </Field>
        <Field label="Conditions d’acceptation">
          <Textarea
            rows={2}
            value={e.conditionsAcceptation ?? ''}
            onChange={(x) => maj({ conditionsAcceptation: x.target.value })}
          />
        </Field>
        <Checkbox
          checked={Boolean(e.champSignature)}
          onChange={(x) => maj({ champSignature: x.target.checked })}
        >
          Champ signature « Bon pour accord »
        </Checkbox>
        <Checkbox
          checked={e.signatureElectronique}
          onChange={(x) => maj({ signatureElectronique: x.target.checked })}
        >
          Acceptation en ligne par le client
        </Checkbox>
        <Checkbox checked={e.tampon} onChange={(x) => maj({ tampon: x.target.checked })}>
          Cachet de l’entreprise
        </Checkbox>
        <Field label="Champ libre : titre">
          <Input
            value={libre.titre}
            placeholder="Garanties"
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
        <Field label="Notes (imprimées sur le devis)">
          <Textarea rows={2} value={e.notes} onChange={(x) => maj({ notes: x.target.value })} />
        </Field>
      </fieldset>
    </>
  );
}
