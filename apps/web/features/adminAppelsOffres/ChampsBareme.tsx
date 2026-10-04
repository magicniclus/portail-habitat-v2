import type { SaisieBareme } from '@ph/core/admin';
import { Field, Input } from '@ph/ui';

const BUDGET = {
  S: 'moins de 5 000 €',
  M: '5 000 à 20 000 €',
  L: '20 000 à 60 000 €',
  XL: 'plus de 60 000 €',
};
const URGENCE = { normale: 'normale', rapide: 'rapide', urgente: 'urgente' };

function Nombre({ nom, label, valeur }: { nom: string; label: string; valeur: number }) {
  return (
    <Field label={label}>
      <Input name={nom} inputMode="decimal" defaultValue={String(valeur)} required />
    </Field>
  );
}

/** Champs du barème : noms `groupe.cle`, relus par `lireSaisie`. */
export function ChampsBareme({ s }: { s: SaisieBareme }) {
  const grille = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4';
  return (
    <>
      <fieldset className="grid gap-3 border-0 p-0">
        <legend className="mb-2 font-bold">Prix de base par métier (€ HT)</legend>
        <div className={grille}>
          {Object.entries(s.prixBaseParMetier).map(([m, v]) => (
            <Nombre key={m} nom={`metier.${m}`} label={m} valeur={v} />
          ))}
          <Nombre nom="prixBaseDefaut" label="Autres métiers" valeur={s.prixBaseDefaut} />
        </div>
      </fieldset>
      <fieldset className="grid gap-3 border-0 p-0">
        <legend className="mb-2 font-bold">Coefficients</legend>
        <div className={grille}>
          {Object.entries(BUDGET).map(([k, l]) => (
            <Nombre
              key={k}
              nom={`coefBudget.${k}`}
              label={`Budget ${l}`}
              valeur={s.coefBudget[k as keyof typeof BUDGET]}
            />
          ))}
          {Object.entries(URGENCE).map(([k, l]) => (
            <Nombre
              key={k}
              nom={`coefUrgence.${k}`}
              label={`Urgence ${l}`}
              valeur={s.coefUrgence[k as keyof typeof URGENCE]}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-3 border-0 p-0">
        <legend className="mb-2 font-bold">Réglages</legend>
        <div className={grille}>
          <Nombre
            nom="remisePremiumPourcent"
            label="Remise Premium (%)"
            valeur={s.remisePremiumPourcent}
          />
          <Nombre nom="eurosParCredit" label="Valeur d’un crédit (€)" valeur={s.eurosParCredit} />
          <Nombre nom="plancher" label="Plancher (€ HT)" valeur={s.plancher} />
          <Nombre nom="plafond" label="Plafond (€ HT)" valeur={s.plafond} />
        </div>
      </fieldset>
    </>
  );
}

const nombre = (v: FormDataEntryValue) => Number(String(v).replace(',', '.'));

/** Formulaire → saisie du barème (validée ensuite par le schéma côté serveur). */
export function lireSaisie(fd: FormData): SaisieBareme {
  const groupe = (prefixe: string) =>
    Object.fromEntries(
      [...fd.entries()]
        .filter(([k]) => k.startsWith(`${prefixe}.`))
        .map(([k, v]) => [k.slice(prefixe.length + 1), nombre(v)]),
    );
  return {
    prixBaseParMetier: groupe('metier'),
    prixBaseDefaut: nombre(fd.get('prixBaseDefaut') ?? ''),
    coefBudget: groupe('coefBudget') as SaisieBareme['coefBudget'],
    coefUrgence: groupe('coefUrgence') as SaisieBareme['coefUrgence'],
    remisePremiumPourcent: nombre(fd.get('remisePremiumPourcent') ?? ''),
    eurosParCredit: nombre(fd.get('eurosParCredit') ?? ''),
    plancher: nombre(fd.get('plancher') ?? ''),
    plafond: nombre(fd.get('plafond') ?? ''),
  };
}
