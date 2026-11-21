'use client';

import { CaretLeftIcon } from '@phosphor-icons/react';
import { useState, type Dispatch } from 'react';
import type { EspaceDessin } from './api';
import type { Action, EtatEditeur } from './etat';
import { CompteRequis, useEssai } from './essai';
import { ExterieurMenu } from './ExterieurMenu';
import { FondMenu } from './FondMenu';
import { ImplantationMenu } from './ImplantationMenu';
import { Ligne } from './LigneMenu';
import { ListeOutilsStructure } from './ListeOutilsStructure';
import { NiveauxMenu } from './NiveauxMenu';
import { ToitureMenu } from './ToitureMenu';

type Sous =
  | 'murs'
  | 'ouvertures'
  | 'escaliers'
  | 'niveaux'
  | 'toiture'
  | 'exterieur'
  | 'implantation'
  | 'fond';
const TITRES: Record<Sous, string> = {
  murs: 'Murs & cloisons',
  ouvertures: 'Portes & fenêtres',
  escaliers: 'Escaliers',
  niveaux: 'Niveaux',
  toiture: 'Toiture & combles',
  exterieur: 'Terrasse, terrain, piscine',
  implantation: 'Implantation sur la parcelle',
  fond: 'Importer un plan',
};
const AIDES: Partial<Record<Sous, string>> = {
  murs: 'Choisissez un type puis cliquez sur le plan pour poser chaque point. Double-clic ou Échap pour finir.',
  ouvertures:
    'Cliquez sur un mur à un bord, puis à l’autre bord : la largeur suit. Le côté du mur où vous cliquez donne le sens d’ouverture. Double-clic : taille standard.',
  escaliers:
    'Choisissez un type puis cliquez sur le plan. Il monte vers le niveau du dessus ; la trémie y apparaît.',
};

/** Menu Structure (DES-06 à DES-15) : murs, ouvertures, escaliers, niveaux, plan importé. */
export function StructureMenu({
  etat,
  dispatch,
  espace,
  planId,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
  espace: EspaceDessin;
  planId: string;
}) {
  const [sous, setSous] = useState<Sous | null>(null);
  const essai = useEssai();
  if (!sous)
    return (
      <div className="grid gap-4">
        <ul className="m-0 grid list-none gap-0.5 p-0">
          {(['murs', 'ouvertures', 'escaliers'] as const).map((s) => (
            <Ligne
              key={s}
              titre={TITRES[s]}
              detail={
                s === 'murs'
                  ? 'Tracé point par point'
                  : s === 'ouvertures'
                    ? 'Portes, fenêtres, baies'
                    : 'Droit, quart tournant, hélicoïdal'
              }
              onClick={() => setSous(s)}
            />
          ))}
          <Ligne
            titre="Pièce rectangulaire"
            detail="Deux coins opposés, quatre murs"
            pressee={etat.outil === 'piece'}
            onClick={() => dispatch({ type: 'outil', outil: 'piece' })}
          />
          <Ligne
            titre="Pièce libre"
            detail="Un clic par angle, clic sur le premier point pour fermer"
            pressee={etat.outil === 'pieceLibre'}
            onClick={() => dispatch({ type: 'outil', outil: 'pieceLibre' })}
          />
          <Ligne
            titre="Niveaux"
            detail="Étages, sous-sol, combles"
            onClick={() => setSous('niveaux')}
          />
          <Ligne
            titre="Toiture & combles"
            detail="Pans, pente, fenêtres de toit"
            onClick={() => setSous('toiture')}
          />
          <Ligne
            titre="Terrasse, terrain, piscine"
            detail="Extérieur, clôtures, végétaux"
            onClick={() => setSous('exterieur')}
          />
          <Ligne
            titre="Implantation"
            detail="Parcelle du cadastre, photo aérienne"
            onClick={() => setSous('implantation')}
          />
          <Ligne
            titre="Importer un plan"
            detail="Une image à décalquer, mise à l’échelle"
            onClick={() => setSous('fond')}
          />
        </ul>
      </div>
    );
  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => setSous(null)}
        className="flex min-h-11 cursor-pointer items-center gap-1 justify-self-start border-0 bg-transparent px-1 text-sm font-semibold text-accent-700"
      >
        <CaretLeftIcon aria-hidden="true" /> Structure
      </button>
      <h3 className="m-0 px-1 text-base font-bold">{TITRES[sous]}</h3>
      {AIDES[sous] ? (
        <p className="m-0 px-1 text-[13px] leading-5 text-neutre-800">{AIDES[sous]}</p>
      ) : null}
      {sous === 'murs' || sous === 'ouvertures' || sous === 'escaliers' ? (
        <ListeOutilsStructure sous={sous} etat={etat} dispatch={dispatch} />
      ) : sous === 'niveaux' ? (
        <NiveauxMenu etat={etat} dispatch={dispatch} />
      ) : sous === 'toiture' ? (
        <ToitureMenu etat={etat} dispatch={dispatch} />
      ) : sous === 'exterieur' ? (
        <ExterieurMenu etat={etat} dispatch={dispatch} />
      ) : essai && (sous === 'implantation' || sous === 'fond') ? (
        <CompteRequis
          pour={
            sous === 'fond' ? 'importer un plan' : 'chercher votre parcelle et sa photo aérienne'
          }
        />
      ) : sous === 'implantation' ? (
        <ImplantationMenu etat={etat} dispatch={dispatch} espace={espace} planId={planId} />
      ) : (
        <FondMenu etat={etat} dispatch={dispatch} espace={espace} planId={planId} />
      )}
    </div>
  );
}
