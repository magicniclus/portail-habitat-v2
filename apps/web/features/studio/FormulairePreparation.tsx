'use client';

import { NOMS_SCENES, SCENES_CAPTURE, type PreparationCaptures } from '@ph/core/studio';
import { Checkbox, Field, Input } from '@ph/ui';

type Artisan = PreparationCaptures['artisan'];
const entier = (v: string) =>
  v.trim() === '' ? undefined : Math.max(0, Math.round(Number(v)) || 0);

/**
 * Artisan d'exemple (fictif, à l'écran dans les captures) et écrans de Portail Travaux à filmer.
 * Les chiffres doivent coller à ce que dit la voix ; l'auteur précise à l'oral que c'est un exemple.
 */
export function FormulairePreparation({
  valeur,
  onChange,
  desactive,
}: {
  valeur: PreparationCaptures;
  onChange: (p: PreparationCaptures) => void;
  desactive: boolean;
}) {
  const a = valeur.artisan;
  const artisan = (champs: Partial<Artisan>) => {
    const suivant = { ...a, ...champs };
    for (const k of Object.keys(suivant) as (keyof Artisan)[])
      if (suivant[k] === undefined) delete suivant[k];
    onChange({ ...valeur, artisan: suivant });
  };
  const nombre = (cle: 'demandesParMois' | 'devisEnvoyes' | 'nombreAvis', libelle: string) => (
    <Field label={libelle}>
      <Input
        inputMode="numeric"
        value={a[cle] ?? ''}
        disabled={desactive}
        onChange={(e) => artisan({ [cle]: entier(e.target.value) })}
      />
    </Field>
  );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <fieldset className="m-0 grid content-start gap-3 border-0 p-0">
        <legend className="mb-2 text-base font-bold">Artisan d’exemple (fictif)</legend>
        <Field label="Nom de l’entreprise">
          <Input
            value={a.nom}
            maxLength={60}
            disabled={desactive}
            onChange={(e) => artisan({ nom: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Métier">
            <Input
              value={a.metier}
              maxLength={40}
              disabled={desactive}
              onChange={(e) => artisan({ metier: e.target.value })}
            />
          </Field>
          <Field label="Ville">
            <Input
              value={a.ville}
              maxLength={60}
              disabled={desactive}
              onChange={(e) => artisan({ ville: e.target.value })}
            />
          </Field>
          {nombre('demandesParMois', 'Demandes par mois')}
          <Field label="Chiffre d’affaires (€)">
            <Input
              inputMode="numeric"
              value={
                a.chiffreAffairesCentimes === undefined
                  ? ''
                  : Math.round(a.chiffreAffairesCentimes / 100)
              }
              disabled={desactive}
              onChange={(e) => {
                const euros = entier(e.target.value);
                artisan({ chiffreAffairesCentimes: euros === undefined ? undefined : euros * 100 });
              }}
            />
          </Field>
          {nombre('devisEnvoyes', 'Devis envoyés')}
          {nombre('nombreAvis', 'Nombre d’avis')}
          <Field label="Note moyenne (1 à 5)">
            <Input
              inputMode="decimal"
              value={a.noteMoyenne ?? ''}
              disabled={desactive}
              onChange={(e) => {
                const n = Number(e.target.value.replace(',', '.'));
                artisan({ noteMoyenne: e.target.value.trim() && n >= 1 && n <= 5 ? n : undefined });
              }}
            />
          </Field>
        </div>
      </fieldset>
      <fieldset className="m-0 grid content-start gap-2 border-0 p-0">
        <legend className="mb-2 text-base font-bold">Écrans à filmer</legend>
        {NOMS_SCENES.map((s) => (
          <Checkbox
            key={s}
            checked={valeur.scenes.includes(s)}
            disabled={desactive || (!valeur.scenes.includes(s) && valeur.scenes.length >= 6)}
            onChange={(e) =>
              onChange({
                ...valeur,
                scenes: e.target.checked
                  ? [...valeur.scenes, s]
                  : valeur.scenes.filter((x) => x !== s),
              })
            }
          >
            <span className="grid">
              <span className="font-semibold">{SCENES_CAPTURE[s].libelle}</span>
              <span className="text-sm text-neutre-700">{SCENES_CAPTURE[s].description}</span>
            </span>
          </Checkbox>
        ))}
      </fieldset>
    </div>
  );
}
