'use client';

import {
  CATALOGUE_OUVERTURES,
  zonesCoulissement,
  type ModificationOuverture,
  type Ouverture,
} from '@ph/core/dessin';
import { Button } from '@ph/ui';
import type { Dispatch } from 'react';
import type { Action } from './etat';
import { InspecteurMenuiserie } from './InspecteurMenuiserie';
import { ChampMesure } from './ChampMesure';
import { TitreSelection } from './blocs';

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
      <InspecteurMenuiserie
        o={o}
        modifier={modifier}
        toutes={(couleur) => dispatch({ type: 'couleurMenuiseries', couleur })}
      />
      <Button variant="secondaire" onClick={() => dispatch({ type: 'supprimerSelection' })}>
        Supprimer
      </Button>
    </div>
  );
}
