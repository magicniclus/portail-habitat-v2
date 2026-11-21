'use client';

import { aire, formatSurface, perimetre, formatLongueur } from '@ph/core/dessin';
import { Button } from '@ph/ui';
import type { Dispatch, ReactNode } from 'react';
import { sceneDe, type Action, type EtatEditeur } from './etat';
import { Info, TitreSelection } from './blocs';

/** Parcelle choisie (DES-19) : surface, périmètre, et comment la retoucher sur le plan. */
export function inspecteurParcelle(etat: EtatEditeur, dispatch: Dispatch<Action>): ReactNode {
  const parcelle = sceneDe(etat).terrain?.parcelle;
  if (etat.selection?.genre !== 'parcelle' || !parcelle) return null;
  return (
    <div className="grid gap-4">
      <TitreSelection titre="Parcelle" />
      <dl className="m-0 grid grid-cols-2 gap-2">
        <Info libelle="Surface" valeur={formatSurface(Math.round(aire(parcelle)))} />
        <Info libelle="Périmètre" valeur={formatLongueur(perimetre(parcelle))} />
      </dl>
      <p className="m-0 text-sm leading-5 text-neutre-800">
        Sur le plan : faites glisser la limite pour déplacer la parcelle, tirez un rond pour
        déplacer un coin, ou un « + » pour ajouter un angle.
      </p>
      <Button variant="secondaire" onClick={() => dispatch({ type: 'parcelleAutour' })}>
        Recaler autour de la maison
      </Button>
      <Button variant="secondaire" onClick={() => dispatch({ type: 'supprimerSelection' })}>
        Supprimer la parcelle
      </Button>
    </div>
  );
}
