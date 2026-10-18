'use client';

import { Checkbox, Field, Input } from '@ph/ui';
import type { EtatDevis } from './etat';

/** Client, chantier et circonstances de la signature (DEV-02, DEV-03). */
export function ChampsClient({
  e,
  maj,
}: {
  e: EtatDevis;
  maj: (patch: Partial<EtatDevis>) => void;
}) {
  const client = (p: Partial<EtatDevis['client']>) => maj({ client: { ...e.client, ...p } });
  return (
    <fieldset className="m-0 grid gap-3 border-0 p-0">
      <legend className="mb-2 text-lg font-bold">Client et chantier</legend>
      <div role="radiogroup" aria-label="Type de client" className="flex flex-wrap gap-4">
        {(['particulier', 'pro'] as const).map((t) => (
          <label key={t} className="flex min-h-11 cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="typeClient"
              checked={e.typeClient === t}
              onChange={() => maj({ typeClient: t })}
              className="size-5 accent-[var(--accent)]"
            />
            {t === 'particulier' ? 'Particulier' : 'Professionnel'}
          </label>
        ))}
      </div>
      <div className="grid gap-3 min-[700px]:grid-cols-2">
        <Field label="Nom du client" requis>
          <Input value={e.client.nom} onChange={(x) => client({ nom: x.target.value })} />
        </Field>
        <Field label="Email du client" aide="Le devis lui est envoyé à cette adresse.">
          <Input
            champ="email"
            value={e.client.email}
            onChange={(x) => client({ email: x.target.value })}
          />
        </Field>
        <Field label="Téléphone">
          <Input
            champ="tel"
            value={e.client.tel}
            onChange={(x) => client({ tel: x.target.value })}
          />
        </Field>
        <Field label="Adresse du chantier" requis>
          <Input value={e.client.adresse} onChange={(x) => client({ adresse: x.target.value })} />
        </Field>
        {e.typeClient === 'pro' ? (
          <Field
            label="SIREN du client"
            requis
            aide="9 chiffres, obligatoire pour un professionnel."
          >
            <Input
              inputMode="numeric"
              value={e.sirenClient}
              onChange={(x) => maj({ sirenClient: x.target.value })}
            />
          </Field>
        ) : null}
      </div>
      {e.typeClient === 'particulier' ? (
        <Checkbox
          checked={e.horsEtablissement}
          onChange={(x) => maj({ horsEtablissement: x.target.checked })}
        >
          Devis signé au domicile du client (droit de rétractation de 14 jours, formulaire joint)
        </Checkbox>
      ) : null}
    </fieldset>
  );
}
