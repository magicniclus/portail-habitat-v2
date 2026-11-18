'use client';

import {
  alertesEscaliers,
  CATALOGUE_OUVERTURES,
  formatLongueur,
  LIBELLES_ESCALIER,
  zonesCoulissement,
  type Escalier,
  type ModificationOuverture,
  type Ouverture,
  type TypeEscalier,
} from '@ph/core/dessin';
import { ArrowArcLeftIcon, ArrowArcRightIcon } from '@phosphor-icons/react';
import { Banner, Button, Field, Select } from '@ph/ui';
import type { Dispatch } from 'react';
import type { Action } from './etat';
import { InspecteurMenuiserie } from './InspecteurMenuiserie';
import { ChampMesure } from './ChampMesure';
import { Info, TitreSelection } from './blocs';

/** Porte ou fenêtre sélectionnée (DES-14) : dimensions, position, sens, côté. */
export function InspecteurOuverture({ o, dispatch }: { o: Ouverture; dispatch: Dispatch<Action> }) {
  const c = CATALOGUE_OUVERTURES[o.type];
  const modifier = (modif: ModificationOuverture) =>
    dispatch({ type: 'modifierOuverture', id: o.id, modif });
  return (
    <div className="grid gap-3.5">
      <TitreSelection titre={c.libelle} />
      <div className="grid grid-cols-2 gap-2.5">
        <ChampMesure
          label="Largeur (cm)"
          mm={o.largeur}
          appliquer={(largeur) => modifier({ largeur })}
        />
        <ChampMesure
          label="Hauteur (cm)"
          mm={o.hauteur}
          appliquer={(hauteur) => modifier({ hauteur })}
        />
        <ChampMesure
          label="Allège (cm)"
          mm={o.allege}
          appliquer={(allege) => modifier({ allege })}
        />
        <ChampMesure
          label="Depuis le coin (cm)"
          mm={o.position}
          appliquer={(position) => modifier({ position })}
        />
      </div>
      {c.famille === 'porte' && !zonesCoulissement(o).length ? (
        <div className="flex flex-wrap gap-2">
          <Button
            taille="sm"
            variant="secondaire"
            onClick={() => modifier({ sens: o.sens === 'gauche' ? 'droite' : 'gauche' })}
          >
            Inverser le sens
          </Button>
          <Button
            taille="sm"
            variant="secondaire"
            onClick={() => modifier({ cote: o.cote === 'interieur' ? 'exterieur' : 'interieur' })}
          >
            Ouvrir de l’autre côté
          </Button>
        </div>
      ) : null}
      <InspecteurMenuiserie o={o} modifier={modifier} />
      <Button variant="secondaire" onClick={() => dispatch({ type: 'supprimerSelection' })}>
        Supprimer
      </Button>
    </div>
  );
}

/** Escalier sélectionné (DES-15) : type, dimensions, rotation, alertes de confort. */
export function InspecteurEscalier({
  e,
  hauteurDessus,
  dispatch,
}: {
  e: Escalier;
  /** Hauteur sous plafond du niveau où l'escalier arrive : échappée (DES-15). */
  hauteurDessus: number | undefined;
  dispatch: Dispatch<Action>;
}) {
  const modifier = (
    modif: Partial<Pick<Escalier, 'type' | 'largeur' | 'hauteurAMonter' | 'rotation'>>,
  ) => dispatch({ type: 'modifierEscalier', id: e.id, modif });
  const alertes = alertesEscaliers({ escaliers: [e] }, hauteurDessus);
  return (
    <div className="grid gap-3.5">
      <TitreSelection titre="Escalier" />
      <Field label="Type">
        <Select
          value={e.type}
          onChange={(ev) => modifier({ type: ev.target.value as TypeEscalier })}
        >
          {(Object.keys(LIBELLES_ESCALIER) as TypeEscalier[]).map((t) => (
            <option key={t} value={t}>
              {LIBELLES_ESCALIER[t]}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <ChampMesure
          label="Largeur (cm)"
          mm={e.largeur}
          appliquer={(largeur) => modifier({ largeur })}
        />
        <ChampMesure
          label="Hauteur à monter (cm)"
          mm={e.hauteurAMonter}
          appliquer={(hauteurAMonter) => modifier({ hauteurAMonter })}
        />
      </div>
      <dl className="m-0 grid grid-cols-2 gap-2 text-sm">
        <Info libelle="Marches" valeur={e.nbMarches} />
        <Info libelle="Giron" valeur={formatLongueur(e.giron, 'cm')} />
      </dl>
      {alertes.map((a) => (
        <Banner key={a.code} tone="attention">
          {a.message}
        </Banner>
      ))}
      <div className="flex gap-2">
        <Button
          taille="sm"
          variant="secondaire"
          onClick={() => modifier({ rotation: e.rotation - 900 })}
        >
          <ArrowArcLeftIcon aria-hidden="true" /> Pivoter
        </Button>
        <Button
          taille="sm"
          variant="secondaire"
          onClick={() => modifier({ rotation: e.rotation + 900 })}
        >
          Pivoter <ArrowArcRightIcon aria-hidden="true" />
        </Button>
      </div>
      <Button variant="secondaire" onClick={() => dispatch({ type: 'supprimerSelection' })}>
        Supprimer
      </Button>
    </div>
  );
}
