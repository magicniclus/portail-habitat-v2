'use client';

import {
  aire,
  contourPiscine,
  distanceAuxLimites,
  formatLongueur,
  formatSurface,
  LIBELLES_FORME_PISCINE,
  volumeEau,
  type FormePiscine,
  type Piscine,
  type Point,
  type Terrasse,
} from '@ph/core/dessin';
import { formatNombre } from '@ph/core/format';
import { Field, Input, Select } from '@ph/ui';
import { useState } from 'react';

type Modifier = (modif: Record<string, unknown>) => void;
const coche = 'flex min-h-11 cursor-pointer items-center justify-between gap-3 px-1 text-sm';

export function ChampCm({
  label,
  mm,
  appliquer,
}: {
  label: string;
  mm: number;
  appliquer: (mm: number) => void;
}) {
  const [saisie, setSaisie] = useState<string | null>(null);
  const valider = () => {
    const cm = Number((saisie ?? '').replace(',', '.'));
    if (saisie !== null && Number.isFinite(cm) && Math.round(cm * 10) !== mm)
      appliquer(Math.round(cm * 10));
    setSaisie(null);
  };
  return (
    <Field label={label}>
      <Input
        inputMode="decimal"
        value={saisie ?? String(Math.round(mm / 10))}
        onChange={(ev) => setSaisie(ev.target.value)}
        onBlur={valider}
        onKeyDown={(ev) => ev.key === 'Enter' && valider()}
      />
    </Field>
  );
}

const Info = ({ libelle, valeur }: { libelle: string; valeur: string }) => (
  <div className="rounded-lg bg-neutre-100 px-2.5 py-2 text-sm">
    <dt className="text-neutre-700">{libelle}</dt>
    <dd className="m-0 font-bold">{valeur}</dd>
  </div>
);

/** Terrasse (DES-18) : matériau, sens de pose, hauteur, garde-corps, pergola. */
export function ReglagesTerrasse({ t, modifier }: { t: Terrasse; modifier: Modifier }) {
  return (
    <>
      <dl className="m-0 grid grid-cols-2 gap-2">
        <Info libelle="Surface" valeur={formatSurface(aire(t.contour))} />
      </dl>
      <Field label="Matériau">
        <Select
          value={t.revetement.famille}
          onChange={(ev) => modifier({ revetement: { ...t.revetement, famille: ev.target.value } })}
        >
          <option value="bois">Bois</option>
          <option value="composite">Composite</option>
          <option value="dalle">Dalles</option>
          <option value="carrelage">Carrelage</option>
          <option value="pierre">Pierre</option>
          <option value="beton_cire">Béton</option>
        </Select>
      </Field>
      <Field label="Sens de pose">
        <Select
          value={t.revetement.orientation ?? 0}
          onChange={(ev) =>
            modifier({ revetement: { ...t.revetement, orientation: Number(ev.target.value) } })
          }
        >
          <option value={0}>Dans la longueur</option>
          <option value={900}>En travers</option>
        </Select>
      </Field>
      <ChampCm
        key={`h${t.hauteur}`}
        label="Hauteur au-dessus du sol (cm)"
        mm={t.hauteur}
        appliquer={(hauteur) => modifier({ hauteur })}
      />
      <label className={coche}>
        Garde-corps
        <input
          type="checkbox"
          className="size-5 accent-accent"
          checked={t.gardeCorps}
          onChange={(ev) => modifier({ gardeCorps: ev.target.checked })}
        />
      </label>
      <label className={coche}>
        Pergola
        <input
          type="checkbox"
          className="size-5 accent-accent"
          checked={t.pergola}
          onChange={(ev) => modifier({ pergola: ev.target.checked })}
        />
      </label>
    </>
  );
}
/** Piscine (DES-20) : forme, dimensions, profondeurs, escalier, volume, distance aux limites. */
export function ReglagesPiscine({
  p,
  parcelle,
  modifier,
}: {
  p: Piscine;
  parcelle: Point[] | undefined;
  modifier: Modifier;
}) {
  return (
    <>
      <Field label="Forme">
        <Select
          value={p.forme}
          onChange={(ev) => modifier({ forme: ev.target.value as FormePiscine })}
        >
          {(Object.keys(LIBELLES_FORME_PISCINE) as FormePiscine[]).map((f) => (
            <option key={f} value={f}>
              {LIBELLES_FORME_PISCINE[f]}
            </option>
          ))}
        </Select>
      </Field>
      <div
        className="grid grid-cols-2 gap-2.5"
        key={`${p.longueur}-${p.largeur}-${p.profondeurMin}-${p.profondeurMax}`}
      >
        <ChampCm
          label="Longueur (cm)"
          mm={p.longueur}
          appliquer={(longueur) => modifier({ longueur })}
        />
        <ChampCm
          label="Largeur (cm)"
          mm={p.largeur}
          appliquer={(largeur) => modifier({ largeur })}
        />
        <ChampCm
          label="Prof. min (cm)"
          mm={p.profondeurMin}
          appliquer={(profondeurMin) => modifier({ profondeurMin })}
        />
        <ChampCm
          label="Prof. max (cm)"
          mm={p.profondeurMax}
          appliquer={(profondeurMax) => modifier({ profondeurMax })}
        />
      </div>
      <Field label="Escalier">
        <Select
          value={p.escalier ?? 'aucun'}
          onChange={(ev) =>
            modifier({ escalier: ev.target.value === 'aucun' ? null : ev.target.value })
          }
        >
          <option value="aucun">Aucun (échelle)</option>
          <option value="roman">Roman</option>
          <option value="droit">Droit</option>
          <option value="angle">D’angle</option>
        </Select>
      </Field>
      <label className={coche}>
        À débordement
        <input
          type="checkbox"
          className="size-5 accent-accent"
          checked={p.debordement}
          onChange={(ev) => modifier({ debordement: ev.target.checked })}
        />
      </label>
      <dl className="m-0 grid grid-cols-2 gap-2">
        <Info libelle="Volume d’eau" valeur={`${formatNombre(volumeEau(p) / 1000, 1)} m³`} />
        <Info libelle="Plan d’eau" valeur={formatSurface(aire(contourPiscine(p)))} />
        {parcelle ? (
          <Info
            libelle="Aux limites (indicatif)"
            valeur={formatLongueur(distanceAuxLimites(contourPiscine(p), parcelle))}
          />
        ) : null}
      </dl>
    </>
  );
}
