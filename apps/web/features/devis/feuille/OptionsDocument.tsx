'use client';

import { LIBELLES_MODE_SAISIE, MODES_SAISIE } from '@ph/core/devis';
import { Badge, Checkbox, Field, Input, RadioCard, RadioCardGroup } from '@ph/ui';
import { versRapide, type EtatDevis } from '../etat';

/** Options › Type de document et Client (maquette : panneau Options de l'éditeur A4). */
export function OptionsDocument({
  e,
  maj,
  facture = false,
}: {
  /** Facture : pas de signature à domicile (propre au devis). */
  facture?: boolean;
  e: EtatDevis;
  maj: (patch: Partial<EtatDevis>) => void;
}) {
  const mode = e.modeSaisie ?? 'complet';
  return (
    <>
      <RadioCardGroup legende="Type de document">
        {MODES_SAISIE.map((m) => (
          <RadioCard
            key={m}
            name="modeSaisie"
            checked={mode === m}
            onChange={() =>
              maj(
                m === 'rapide'
                  ? { modeSaisie: m, lignes: versRapide(e.lignes) }
                  : { modeSaisie: m },
              )
            }
            titre={LIBELLES_MODE_SAISIE[m].titre}
            description={LIBELLES_MODE_SAISIE[m].aide}
            className="p-3"
          />
        ))}
        <RadioCard
          name="modeSaisie"
          disabled
          titre="Format électronique"
          description="Factur-X, obligatoire entre professionnels en 2027."
          complement={<Badge tone="neutre">Bientôt</Badge>}
          className="p-3"
        />
      </RadioCardGroup>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-2 text-[15px] font-semibold">Client</legend>
        <div role="radiogroup" aria-label="Type de client" className="flex flex-wrap gap-4">
          {(['particulier', 'pro'] as const).map((t) => (
            <label key={t} className="flex min-h-11 cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="typeClient"
                checked={e.typeClient === t}
                onChange={() => maj({ typeClient: t })}
                className="size-5 accent-accent-action"
              />
              {t === 'particulier' ? 'Particulier' : 'Professionnel'}
            </label>
          ))}
        </div>
        {e.typeClient === 'pro' ? (
          <>
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
            <Field label="N° de TVA intracommunautaire du client">
              <Input
                value={e.tvaIntraClient ?? ''}
                onChange={(x) => maj({ tvaIntraClient: x.target.value })}
              />
            </Field>
          </>
        ) : facture ? null : (
          <Checkbox
            checked={e.horsEtablissement}
            onChange={(x) => maj({ horsEtablissement: x.target.checked })}
          >
            Signé au domicile du client (rétractation de 14 jours, formulaire joint)
          </Checkbox>
        )}
        <Field label="Adresse du chantier" aide="Si elle diffère de celle du client.">
          <Input
            value={e.adresseChantier ?? ''}
            onChange={(x) => maj({ adresseChantier: x.target.value })}
          />
        </Field>
      </fieldset>
    </>
  );
}
