'use client';

import {
  CATALOGUE_OUVERTURES,
  LIBELLES_ESCALIER,
  LIBELLES_MUR,
  type TypeEscalier,
  type TypeMur,
  type TypeOuverture,
} from '@ph/core/dessin';
import type { Dispatch } from 'react';
import type { Action, EtatEditeur } from './etat';
import { ApercuMur, ApercuOuverture } from './Apercus';
import { Ligne } from './LigneMenu';

const MURS: { type: TypeMur; libelle: string; detail: string }[] = [
  { type: 'mur', libelle: LIBELLES_MUR.mur, detail: 'Épaisseur 20 cm' },
  { type: 'cloison', libelle: LIBELLES_MUR.cloison, detail: 'Épaisseur 7,2 cm' },
  { type: 'demi_mur', libelle: LIBELLES_MUR.demi_mur, detail: 'Hauteur 1,10 m' },
  { type: 'muret', libelle: LIBELLES_MUR.muret, detail: 'Hauteur 60 cm' },
  { type: 'separation', libelle: LIBELLES_MUR.separation, detail: 'Sépare deux pièces sans mur' },
  { type: 'poteau', libelle: LIBELLES_MUR.poteau, detail: 'Section 20 cm, deux clics' },
  { type: 'poutre', libelle: LIBELLES_MUR.poutre, detail: 'Sous le plafond, deux clics' },
];

/** Outils à placer du menu Structure : murs, portes et fenêtres, escaliers (DES-06 à DES-15). */
export function ListeOutilsStructure({
  sous,
  etat,
  dispatch,
}: {
  sous: 'murs' | 'ouvertures' | 'escaliers';
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
}) {
  if (sous === 'murs')
    return (
      <ul className="m-0 grid list-none gap-0.5 p-0">
        {MURS.map((m) => (
          <Ligne
            key={m.type}
            titre={m.libelle}
            detail={m.detail}
            apercu={<ApercuMur type={m.type} />}
            pressee={etat.outil === 'mur' && etat.typeMur === m.type}
            onClick={() => dispatch({ type: 'outil', outil: 'mur', typeMur: m.type })}
          />
        ))}
      </ul>
    );
  if (sous === 'ouvertures')
    return (
      <ul className="m-0 grid list-none gap-0.5 p-0">
        {(Object.keys(CATALOGUE_OUVERTURES) as TypeOuverture[]).map((t) => {
          const c = CATALOGUE_OUVERTURES[t];
          return (
            <Ligne
              key={t}
              titre={c.libelle}
              detail={`${c.largeur / 10} × ${c.hauteur / 10} cm`}
              apercu={<ApercuOuverture type={t} />}
              pressee={etat.outil === 'ouverture' && etat.typeOuverture === t}
              onClick={() => dispatch({ type: 'outil', outil: 'ouverture', typeOuverture: t })}
            />
          );
        })}
      </ul>
    );
  return (
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
          pressee={etat.outil === 'escalier' && etat.typeEscalier === t}
          onClick={() => dispatch({ type: 'outil', outil: 'escalier', typeEscalier: t })}
        />
      ))}
    </ul>
  );
}
