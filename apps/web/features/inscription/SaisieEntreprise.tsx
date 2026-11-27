'use client';

import { Field, Input } from '@ph/ui';

export interface EntrepriseSaisie {
  siret: string;
  raisonSociale: string;
  adresse: { ligne1: string; codePostal: string; ville: string };
}

export const SAISIE_VIDE: EntrepriseSaisie = {
  siret: '',
  raisonSociale: '',
  adresse: { ligne1: '', codePostal: '', ville: '' },
};

/**
 * « Je ne trouve pas mon entreprise » (décision du 15/11/2026) : SIRET, nom et adresse du siège
 * saisis à la main. Le serveur les contrôle ; la fiche reste hors ligne jusqu'à la vérification.
 */
export function SaisieEntreprise({
  valeur,
  onChange,
}: {
  valeur: EntrepriseSaisie;
  onChange: (v: EntrepriseSaisie) => void;
}) {
  const adresse = (cle: keyof EntrepriseSaisie['adresse'], v: string) =>
    onChange({ ...valeur, adresse: { ...valeur.adresse, [cle]: v } });
  return (
    <fieldset className="m-0 grid gap-3 rounded-[12px] border border-trait p-3.5">
      <legend className="px-1 text-sm font-semibold">Votre entreprise, saisie à la main</legend>
      <p className="m-0 text-sm leading-[21px] text-neutre-800">
        Nous vérifions ces informations sous 48 h ouvrées. Votre espace est utilisable tout de suite
        ; votre fiche sera en ligne dès la vérification faite.
      </p>
      <Field
        label="Numéro SIRET"
        requis
        aide="14 chiffres, sur votre Kbis ou votre avis de situation"
      >
        <Input
          inputMode="numeric"
          autoComplete="off"
          maxLength={20}
          value={valeur.siret}
          onChange={(e) => onChange({ ...valeur, siret: e.target.value })}
          placeholder="552 100 554 00013"
        />
      </Field>
      <Field label="Nom de l’entreprise" requis>
        <Input
          autoComplete="organization"
          maxLength={200}
          value={valeur.raisonSociale}
          onChange={(e) => onChange({ ...valeur, raisonSociale: e.target.value })}
        />
      </Field>
      <Field label="Adresse du siège" requis>
        <Input
          autoComplete="street-address"
          maxLength={200}
          value={valeur.adresse.ligne1}
          onChange={(e) => adresse('ligne1', e.target.value)}
          placeholder="14 rue des Faures"
        />
      </Field>
      <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3">
        <Field label="Code postal" requis>
          <Input
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            value={valeur.adresse.codePostal}
            onChange={(e) => adresse('codePostal', e.target.value)}
          />
        </Field>
        <Field label="Ville" requis>
          <Input
            autoComplete="address-level2"
            maxLength={80}
            value={valeur.adresse.ville}
            onChange={(e) => adresse('ville', e.target.value)}
          />
        </Field>
      </div>
    </fieldset>
  );
}
