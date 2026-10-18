'use client';

import { Button, Field, Input, RadioCard, RadioCardGroup, Select } from '@ph/ui';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { routes } from '@/lib/routes';
import {
  MOTIFS_BIEN,
  PERIODES_BIEN,
  TYPES_BIEN,
  type Bien,
  type DonneesParcoursDiag,
} from './types';

/** Étape 1 « Votre bien » (maquette Parcours Diagnostic). Aucune coordonnée avant l'étape 3. */
export function EtapeBien({
  bien,
  communes,
  onChange,
  onSuivant,
}: {
  bien: Bien;
  communes: DonneesParcoursDiag['communes'];
  onChange: (b: Bien) => void;
  onSuivant: () => void;
}) {
  const [erreurs, setErreurs] = useState<{ adresse?: string; cp?: string }>({});
  const commune = communes.find((c) => c.id === bien.communeSlug);
  const maj = (p: Partial<Bien>) => onChange({ ...bien, ...p });

  const suivant = (e: FormEvent) => {
    e.preventDefault();
    const err = {
      ...(bien.adresse.trim().length < 3 ? { adresse: 'Indiquez l’adresse du bien.' } : {}),
      ...(!/^\d{5}$/.test(bien.codePostal) ? { cp: 'Code postal à 5 chiffres.' } : {}),
    };
    setErreurs(err);
    if (Object.keys(err).length) return;
    onSuivant();
  };

  return (
    <form
      onSubmit={suivant}
      noValidate
      className="grid gap-[22px] rounded-[18px] bg-blanc p-[clamp(20px,3vw,32px)] shadow-md"
    >
      <div>
        <h1 className="m-0 mb-2 text-[clamp(24px,2.8vw,32px)] leading-[1.12]">Votre bien</h1>
        <p className="m-0 max-w-[56ch] text-[15.5px] leading-6 text-neutre-800">
          L&apos;adresse et l&apos;année de construction suffisent à déterminer la quasi-totalité du
          dossier réglementaire.
        </p>
      </div>
      <Field label="Adresse du bien" requis erreur={erreurs.adresse}>
        <Input
          champ="adresse"
          placeholder="12 rue Camille Pelletan"
          value={bien.adresse}
          onChange={(e) => maj({ adresse: e.target.value })}
          className="min-h-12"
        />
      </Field>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Commune">
          <Select
            value={bien.communeSlug}
            onChange={(e) => {
              const c = communes.find((x) => x.id === e.target.value);
              maj({ communeSlug: e.target.value, codePostal: c?.cp ?? '' });
            }}
            className="min-h-12"
          >
            {communes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Motif">
          <Select
            value={bien.motif}
            onChange={(e) => maj({ motif: e.target.value as Bien['motif'] })}
            className="min-h-12"
          >
            {MOTIFS_BIEN.map((m) => (
              <option key={m.v} value={m.v}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        {commune && !commune.cp ? (
          <Field label="Code postal du bien" requis erreur={erreurs.cp}>
            <Input
              champ="codePostal"
              placeholder="33000"
              value={bien.codePostal}
              onChange={(e) => maj({ codePostal: e.target.value.replace(/\D/g, '').slice(0, 5) })}
              className="min-h-12"
            />
          </Field>
        ) : null}
      </div>
      <RadioCardGroup
        legende={
          <>
            <span className="block text-[16.5px] font-bold">Type de bien</span>
            <span className="block text-sm font-normal text-neutre-800">
              Le mesurage exigé n&apos;est pas le même.
            </span>
          </>
        }
      >
        {TYPES_BIEN.map((t) => (
          <RadioCard
            key={t.v}
            name="type"
            value={t.v}
            checked={bien.type === t.v}
            onChange={() => maj({ type: t.v })}
            titre={t.label}
            description={t.desc}
          />
        ))}
      </RadioCardGroup>
      <RadioCardGroup
        legende={
          <>
            <span className="block text-[16.5px] font-bold">Année de construction</span>
            <span className="block text-sm font-normal text-neutre-800">
              C&apos;est elle qui déclenche l&apos;amiante (avant juillet 1997) et le plomb (avant
              1949).
            </span>
          </>
        }
      >
        {PERIODES_BIEN.map((p) => (
          <RadioCard
            key={p.v}
            name="periode"
            value={p.v}
            checked={bien.periode === p.v}
            onChange={() => maj({ periode: p.v })}
            titre={p.label}
            description={p.desc}
          />
        ))}
      </RadioCardGroup>
      <div>
        <label htmlFor="dg-surface" className="mb-1 flex items-baseline gap-2">
          <span className="text-[16.5px] font-bold">Surface</span>
          <span className="ml-auto text-2xl font-bold text-accent-700">{bien.surface} m²</span>
        </label>
        <input
          id="dg-surface"
          type="range"
          min={15}
          max={300}
          step={5}
          value={bien.surface}
          aria-valuetext={`${bien.surface} m²`}
          onChange={(e) => maj({ surface: Number(e.target.value) })}
          className="h-11 w-full cursor-pointer accent-accent-action"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-trait pt-5">
        <Button type="submit" taille="lg">
          Continuer
        </Button>
        <Link href={routes.diagnostic} className="inline-flex min-h-11 items-center px-3">
          Annuler
        </Link>
        <span className="text-[13.5px] text-neutre-700 sm:ml-auto">
          Aucune coordonnée demandée avant l&apos;étape 3.
        </span>
      </div>
    </form>
  );
}
