'use client';

import {
  CATALOGUE_OUVERTURES,
  LIBELLES_ESCALIER,
  type TypeEscalier,
  type TypeMur,
  type TypeOuverture,
} from '@ph/core/dessin';
import { CaretLeftIcon } from '@phosphor-icons/react';
import { useState, type Dispatch } from 'react';
import type { EspaceDessin } from './api';
import type { Action, EtatEditeur } from './etat';
import { ExterieurMenu } from './ExterieurMenu';
import { FondMenu } from './FondMenu';
import { Ligne } from './LigneMenu';
import { NiveauxMenu } from './NiveauxMenu';
import { ToitureMenu } from './ToitureMenu';

const MURS: { type: TypeMur; libelle: string; detail: string }[] = [
  { type: 'mur', libelle: 'Mur', detail: 'Épaisseur 20 cm' },
  { type: 'cloison', libelle: 'Cloison', detail: 'Épaisseur 7,2 cm' },
  { type: 'demi_mur', libelle: 'Demi-mur', detail: 'Hauteur 1,10 m' },
  { type: 'muret', libelle: 'Muret', detail: 'Hauteur 60 cm' },
  { type: 'separation', libelle: 'Séparation invisible', detail: 'Sépare deux pièces sans mur' },
];

type Sous = 'murs' | 'ouvertures' | 'escaliers' | 'niveaux' | 'toiture' | 'exterieur' | 'fond';
const TITRES: Record<Sous, string> = {
  murs: 'Murs & cloisons',
  ouvertures: 'Portes & fenêtres',
  escaliers: 'Escaliers',
  niveaux: 'Niveaux',
  toiture: 'Toiture & combles',
  exterieur: 'Terrasse, terrain, piscine',
  fond: 'Importer un plan',
};
const AIDES: Partial<Record<Sous, string>> = {
  murs: 'Choisissez un type puis cliquez sur le plan pour poser chaque point. Double-clic ou Échap pour finir.',
  ouvertures: 'Choisissez un modèle puis cliquez sur un mur : elle s’y place, centrée sur le clic.',
  escaliers:
    'Choisissez un type puis cliquez sur le plan. Il monte vers le niveau du dessus ; la trémie y apparaît.',
};
const tracer = <span className="text-xs font-bold text-accent-700">Placer</span>;

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
            action={tracer}
            onClick={() => dispatch({ type: 'outil', outil: 'piece' })}
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
      {sous === 'murs' ? (
        <ul className="m-0 grid list-none gap-0.5 p-0">
          {MURS.map((m) => (
            <Ligne
              key={m.type}
              titre={m.libelle}
              detail={m.detail}
              action={tracer}
              pressee={etat.outil === 'mur' && etat.typeMur === m.type}
              onClick={() => dispatch({ type: 'outil', outil: 'mur', typeMur: m.type })}
            />
          ))}
        </ul>
      ) : sous === 'ouvertures' ? (
        <ul className="m-0 grid list-none gap-0.5 p-0">
          {(Object.keys(CATALOGUE_OUVERTURES) as TypeOuverture[]).map((t) => {
            const c = CATALOGUE_OUVERTURES[t];
            return (
              <Ligne
                key={t}
                titre={c.libelle}
                detail={`${c.largeur / 10} × ${c.hauteur / 10} cm`}
                action={tracer}
                pressee={etat.outil === 'ouverture' && etat.typeOuverture === t}
                onClick={() => dispatch({ type: 'outil', outil: 'ouverture', typeOuverture: t })}
              />
            );
          })}
        </ul>
      ) : sous === 'escaliers' ? (
        <ul className="m-0 grid list-none gap-0.5 p-0">
          {(Object.keys(LIBELLES_ESCALIER) as TypeEscalier[]).map((t) => (
            <Ligne
              key={t}
              titre={LIBELLES_ESCALIER[t]}
              detail={
                t === 'meunier'
                  ? 'Pente raide, peu de place'
                  : 'Marches calculées pour monter d’un niveau'
              }
              action={tracer}
              pressee={etat.outil === 'escalier' && etat.typeEscalier === t}
              onClick={() => dispatch({ type: 'outil', outil: 'escalier', typeEscalier: t })}
            />
          ))}
        </ul>
      ) : sous === 'niveaux' ? (
        <NiveauxMenu etat={etat} dispatch={dispatch} />
      ) : sous === 'toiture' ? (
        <ToitureMenu etat={etat} dispatch={dispatch} />
      ) : sous === 'exterieur' ? (
        <ExterieurMenu etat={etat} dispatch={dispatch} />
      ) : (
        <FondMenu etat={etat} dispatch={dispatch} espace={espace} planId={planId} />
      )}
    </div>
  );
}
