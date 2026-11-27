'use client';

import {
  alertesTerrasses,
  formatVolume,
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
import { Banner, Field, Select } from '@ph/ui';
import { ChampMesure } from './ChampMesure';
import { Info } from './blocs';

type Modifier = (modif: Record<string, unknown>) => void;
const coche = 'flex min-h-11 cursor-pointer items-center justify-between gap-3 px-1 text-sm';

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
          <option value={450}>En diagonale</option>
        </Select>
      </Field>
      <ChampMesure
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
      {alertesTerrasses({ exterieur: { terrasses: [t] } }).map((a) => (
        <Banner key={a.code} tone="attention">
          {a.message}
        </Banner>
      ))}
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
        <ChampMesure
          label="Longueur (cm)"
          mm={p.longueur}
          appliquer={(longueur) => modifier({ longueur })}
        />
        <ChampMesure
          label="Largeur (cm)"
          mm={p.largeur}
          appliquer={(largeur) => modifier({ largeur })}
        />
        <ChampMesure
          label="Prof. min (cm)"
          mm={p.profondeurMin}
          appliquer={(profondeurMin) => modifier({ profondeurMin })}
        />
        <ChampMesure
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
        <Info libelle="Volume d’eau" valeur={formatVolume(volumeEau(p))} />
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
