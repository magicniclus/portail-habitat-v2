'use client';

import {
  aire,
  collisions,
  formatSurface,
  LIBELLES_FAMILLE,
  objetDuCatalogue,
  plagesDe,
  type Objet,
  type ZoneDeco,
} from '@ph/core/dessin';
import { Banner, Button } from '@ph/ui';
import { COULEURS_OBJETS } from '@ph/ui/tokens';
import type { Dispatch } from 'react';
import { niveauDe, type Action, type EtatEditeur } from './etat';
import { Nuancier } from './Nuancier';
import { RotationObjet } from './RotationObjet';
import { ChampMesure } from './ChampMesure';
import { CaseVerrou, surtitre } from './blocs';

/** « 40–240 cm » : plage réglable d'un objet du catalogue. */
const aidePlage = (p: readonly [number, number]) =>
  `${Math.max(1, Math.round(p[0] / 10))}–${Math.round(p[1] / 10)} cm`;
const titre = surtitre;

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
        <ChampMesure
          label="Largeur"
          aide={aidePlage(plages.l)}
          mm={o.dimensions.l}
          min={10}
          appliquer={dims('l')}
        />
        <ChampMesure
          label="Profondeur"
          aide={aidePlage(plages.p)}
          mm={o.dimensions.p}
          min={10}
          appliquer={dims('p')}
        />
        <ChampMesure
          label="Hauteur"
          aide={aidePlage(plages.h)}
          mm={o.dimensions.h}
          min={10}
          appliquer={dims('h')}
        />
      </div>
      <RotationObjet o={o} dispatch={dispatch} />
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
      <CaseVerrou
        verrouille={o.verrouille === true}
        basculer={(valeur) => dispatch({ type: 'verrouillerSelection', valeur })}
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

/**
 * Zone décorative au sol (DES-27) : son identité et sa surface. Le matériau se choisit dans
 * Finitions (un seul endroit pour les revêtements, pas de doublon ici).
 */
function InspecteurZone({
  z,
  finitions,
  dispatch,
}: {
  z: ZoneDeco;
  finitions: boolean;
  dispatch: Dispatch<Action>;
}) {
  return (
    <div className="grid gap-4">
      <div>
        <p className={titre}>Sélection</p>
        <h2 className="m-0 text-xl font-bold">Zone au sol</h2>
        <p className="m-0 text-sm text-neutre-800">
          {LIBELLES_FAMILLE[z.revetement.famille] ?? 'Revêtement'} ·{' '}
          {formatSurface(aire(z.contour))}
        </p>
      </div>
      {finitions ? (
        <p className="m-0 text-sm leading-5 text-neutre-800">
          Choisissez son matériau dans Finitions, à gauche.
        </p>
      ) : (
        <Button
          variant="secondaire"
          onClick={() => dispatch({ type: 'menu', menu: 'finitions', basculer: false })}
        >
          Choisir le matériau
        </Button>
      )}
      <Button variant="secondaire" onClick={() => dispatch({ type: 'supprimerSelection' })}>
        Supprimer la zone
      </Button>
    </div>
  );
}

/** Inspecteur de la sélection d'aménagement (objet ou zone) ; `null` sinon. */
export function inspecteurAmenagement(etat: EtatEditeur, dispatch: Dispatch<Action>) {
  const n = niveauDe(etat);
  const s = etat.selection;
  const o = s?.genre === 'objet' ? n.objets.find((x) => x.id === s.id) : undefined;
  if (o) return <InspecteurObjet key={o.id} o={o} etat={etat} dispatch={dispatch} />;
  const z = s?.genre === 'zone' ? n.zonesDeco.find((x) => x.id === s.id) : undefined;
  return z ? (
    <InspecteurZone z={z} finitions={etat.menu === 'finitions'} dispatch={dispatch} />
  ) : null;
}
