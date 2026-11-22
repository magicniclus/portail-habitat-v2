'use client';

import {
  CATALOGUE_OUVERTURES,
  GROUPES_OUVERTURES,
  LIBELLES_MUR,
  MODELES_ESCALIER,
  type ModeleEscalier,
  type TypeMur,
} from '@ph/core/dessin';
import type { Dispatch } from 'react';
import type { Action, EtatEditeur } from './etat';
import { ApercuMur, ApercuOuverture } from './Apercus';
import { ApercuModeleEscalier } from './ApercusEscalier';
import { Ligne, SousSection } from './LigneMenu';

const MURS: { type: TypeMur; libelle: string; detail: string }[] = [
  { type: 'mur', libelle: LIBELLES_MUR.mur, detail: 'Épaisseur 20 cm' },
  { type: 'cloison', libelle: LIBELLES_MUR.cloison, detail: 'Épaisseur 7,2 cm' },
  { type: 'demi_mur', libelle: LIBELLES_MUR.demi_mur, detail: 'Hauteur 1,10 m' },
  { type: 'muret', libelle: LIBELLES_MUR.muret, detail: 'Hauteur 60 cm' },
  { type: 'separation', libelle: LIBELLES_MUR.separation, detail: 'Sépare deux pièces sans mur' },
  { type: 'poteau', libelle: LIBELLES_MUR.poteau, detail: 'Section 20 cm, deux clics' },
  { type: 'poutre', libelle: LIBELLES_MUR.poutre, detail: 'Sous le plafond, deux clics' },
];

/** Sous-sections du menu Murs & cloisons. */
const GROUPES_MURS: { libelle: string; types: TypeMur[] }[] = [
  { libelle: 'Murs et cloisons', types: ['mur', 'cloison', 'demi_mur', 'muret'] },
  { libelle: 'Structure et repères', types: ['poteau', 'poutre', 'separation'] },
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
      <div className="grid gap-1">
        {GROUPES_MURS.map((g) => (
          <SousSection key={g.libelle} titre={g.libelle} nombre={g.types.length}>
            {MURS.filter((m) => g.types.includes(m.type)).map((m) => (
              <Ligne
                key={m.type}
                titre={m.libelle}
                detail={m.detail}
                apercu={<ApercuMur type={m.type} />}
                pressee={etat.outil === 'mur' && etat.typeMur === m.type}
                onClick={() => dispatch({ type: 'outil', outil: 'mur', typeMur: m.type })}
              />
            ))}
          </SousSection>
        ))}
      </div>
    );
  if (sous === 'ouvertures')
    return (
      <div className="grid gap-1">
        {GROUPES_OUVERTURES.map((g) => (
          <SousSection key={g.libelle} titre={g.libelle} nombre={g.types.length}>
            {g.types.map((t) => {
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
          </SousSection>
        ))}
      </div>
    );
  // Escaliers : cartes des modèles ; les tracés se dessinent clic par clic, les autres d'un clic.
  const carte = (id: ModeleEscalier) => {
    const choisi = etat.outil === 'escalier' && etat.modeleEscalier === id;
    return (
      <button
        key={id}
        type="button"
        aria-pressed={choisi}
        aria-label={`${MODELES_ESCALIER[id].libelle} : ${MODELES_ESCALIER[id].detail}`}
        onClick={() => dispatch({ type: 'outil', outil: 'escalier', modeleEscalier: id })}
        className={`grid min-h-24 cursor-pointer content-start justify-items-center gap-1.5 rounded-xl border-2 p-2 text-[13px] leading-4 font-semibold font-[inherit] text-texte transition-colors ${choisi ? 'border-accent bg-accent-100' : 'border-transparent bg-neutre-100 hover:bg-neutre-200'}`}
      >
        <ApercuModeleEscalier modele={id} />
        {MODELES_ESCALIER[id].libelle}
      </button>
    );
  };
  const ids = Object.keys(MODELES_ESCALIER) as ModeleEscalier[];
  return (
    <div className="grid gap-1">
      <SousSection titre="À tracer" nombre={ids.filter((id) => MODELES_ESCALIER[id].trace).length}>
        <li className="grid grid-cols-3 gap-2 pb-1">
          {ids.filter((id) => MODELES_ESCALIER[id].trace).map(carte)}
        </li>
      </SousSection>
      <SousSection titre="Compacts" nombre={ids.filter((id) => !MODELES_ESCALIER[id].trace).length}>
        <li className="grid grid-cols-3 gap-2 pb-1">
          {ids.filter((id) => !MODELES_ESCALIER[id].trace).map(carte)}
        </li>
      </SousSection>
    </div>
  );
}
