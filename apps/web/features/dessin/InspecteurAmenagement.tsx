'use client';

import {
  collisions,
  LIBELLES_FAMILLE,
  objetDuCatalogue,
  plagesDe,
  type Objet,
  type ZoneDeco,
} from '@ph/core/dessin';
import { Banner, Button, Field, Input } from '@ph/ui';
import { COULEURS_OBJETS } from '@ph/ui/tokens';
import { useState, type Dispatch } from 'react';
import { niveauDe, type Action, type EtatEditeur } from './etat';
import { Nuancier } from './Nuancier';

const titre = 'm-0 text-xs font-bold tracking-wide text-neutre-700 uppercase';

function Cote({
  label,
  mm,
  plage,
  appliquer,
}: {
  label: string;
  mm: number;
  plage: readonly [number, number];
  appliquer: (mm: number) => void;
}) {
  const [saisie, setSaisie] = useState(String(Math.round(mm / 10)));
  const valider = () => {
    const cm = Number(saisie.replace(',', '.'));
    if (Number.isFinite(cm) && Math.round(cm * 10) !== mm) appliquer(Math.round(cm * 10));
  };
  return (
    <Field
      label={label}
      aide={`${Math.max(1, Math.round(plage[0] / 10))}–${Math.round(plage[1] / 10)} cm`}
    >
      <Input
        inputMode="decimal"
        value={saisie}
        onChange={(ev) => setSaisie(ev.target.value)}
        onBlur={valider}
        onKeyDown={(ev) => ev.key === 'Enter' && valider()}
      />
    </Field>
  );
}

/** Objet choisi (DES-22) : dimensions, couleur, rotation, copie, collisions. */
function InspecteurObjet({
  o,
  etat,
  dispatch,
}: {
  o: Objet;
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
}) {
  const c = objetDuCatalogue(o.catalogueId);
  const plages: Record<'l' | 'p' | 'h', readonly [number, number]> = c
    ? plagesDe(c)
    : { l: [10, 10_000], p: [10, 10_000], h: [10, 5_000] };
  const gene = collisions(niveauDe(etat)).some((x) => x.objetId === o.id || x.avec.id === o.id);
  const dims = (cle: 'l' | 'p' | 'h') => (v: number) =>
    dispatch({
      type: 'modifierObjet',
      id: o.id,
      modif: { dimensions: { ...o.dimensions, [cle]: v } },
    });
  const tourner = (angle: number) => dispatch({ type: 'tournerObjet', id: o.id, angle });
  return (
    <div className="grid gap-4">
      <div>
        <p className={titre}>Sélection</p>
        <h2 className="m-0 text-xl font-bold">{c?.libelle ?? 'Objet'}</h2>
      </div>
      {gene ? (
        <Banner tone="attention" titre="Chevauchement">
          Cet élément touche un mur ou un autre meuble.
        </Banner>
      ) : null}
      <div className="grid grid-cols-3 gap-3 [&_label]:break-words">
        <Cote label="Largeur" mm={o.dimensions.l} plage={plages.l} appliquer={dims('l')} />
        <Cote label="Profondeur" mm={o.dimensions.p} plage={plages.p} appliquer={dims('p')} />
        <Cote label="Hauteur" mm={o.dimensions.h} plage={plages.h} appliquer={dims('h')} />
      </div>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-2 text-[13px] font-semibold">
          Rotation · {Math.round(o.rotation / 10)}°
        </legend>
        <div className="grid grid-cols-4 gap-2">
          <Button
            variant="secondaire"
            aria-label="Tourner de 90° à gauche"
            onClick={() => tourner(-900)}
          >
            −90°
          </Button>
          <Button
            variant="secondaire"
            aria-label="Tourner de 15° à gauche"
            onClick={() => tourner(-150)}
          >
            −15°
          </Button>
          <Button
            variant="secondaire"
            aria-label="Tourner de 15° à droite"
            onClick={() => tourner(150)}
          >
            +15°
          </Button>
          <Button
            variant="secondaire"
            aria-label="Tourner de 90° à droite"
            onClick={() => tourner(900)}
          >
            +90°
          </Button>
        </div>
      </fieldset>
      <Nuancier
        legende="Couleur"
        teintes={COULEURS_OBJETS}
        active={o.materiaux.facade}
        choisir={(t) =>
          dispatch({
            type: 'modifierObjet',
            id: o.id,
            modif: { materiaux: { ...o.materiaux, facade: t.couleur } },
          })
        }
      />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondaire" onClick={() => dispatch({ type: 'dupliquerObjet', id: o.id })}>
          Dupliquer
        </Button>
        <Button variant="secondaire" onClick={() => dispatch({ type: 'supprimerSelection' })}>
          Supprimer
        </Button>
      </div>
    </div>
  );
}

/** Zone décorative au sol (DES-27) : revêtement modifiable depuis Finitions. */
function InspecteurZone({ z, dispatch }: { z: ZoneDeco; dispatch: Dispatch<Action> }) {
  return (
    <div className="grid gap-4">
      <div>
        <p className={titre}>Sélection</p>
        <h2 className="m-0 text-xl font-bold">Zone au sol</h2>
        <p className="m-0 text-sm text-neutre-800">
          {LIBELLES_FAMILLE[z.revetement.famille] ?? 'Revêtement'}
        </p>
      </div>
      <Button onClick={() => dispatch({ type: 'menu', menu: 'finitions', basculer: false })}>
        Changer le revêtement
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondaire"
          onClick={() => dispatch({ type: 'copierStyle', revetement: z.revetement })}
        >
          Copier le style
        </Button>
        <Button variant="secondaire" onClick={() => dispatch({ type: 'supprimerSelection' })}>
          Supprimer
        </Button>
      </div>
    </div>
  );
}

/** Inspecteur de la sélection d'aménagement (objet ou zone) ; `null` sinon. */
export function inspecteurAmenagement(etat: EtatEditeur, dispatch: Dispatch<Action>) {
  const n = niveauDe(etat);
  const s = etat.selection;
  const o = s?.genre === 'objet' ? n.objets.find((x) => x.id === s.id) : undefined;
  if (o)
    return (
      <InspecteurObjet
        key={`${o.id}-${o.dimensions.l}-${o.dimensions.p}-${o.dimensions.h}`}
        o={o}
        etat={etat}
        dispatch={dispatch}
      />
    );
  const z = s?.genre === 'zone' ? n.zonesDeco.find((x) => x.id === s.id) : undefined;
  return z ? <InspecteurZone z={z} dispatch={dispatch} /> : null;
}
