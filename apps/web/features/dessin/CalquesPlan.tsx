'use client';

import { memoCalque } from './memoCalque';
import {
  centroide,
  contourMur,
  formatLongueur,
  formatSurface,
  LIBELLES_MUR,
  longueurMur,
  surfaceCarrez,
  type Niveau,
} from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import type { Dispatch, PointerEvent } from 'react';
import type { Action, EtatEditeur } from './etat';
import { remplissage } from './Motifs';
import { activer, points } from './svg';

/** Pièces : sol coloré selon le revêtement ; sélectionnables au clic ou au clavier. */
type Calque<KN extends keyof Niveau> = {
  niveau: Pick<Niveau, KN>;
  etat: Pick<EtatEditeur, 'selection' | 'outil'>;
  dispatch: Dispatch<Action>;
};

function PiecesSvgBrut({ niveau, etat, dispatch }: Calque<'pieces'>) {
  return niveau.pieces.map((p) => {
    const choisie = etat.selection?.genre === 'piece' && etat.selection.id === p.id;
    const choisir = () =>
      dispatch({ type: 'selectionner', selection: { genre: 'piece', id: p.id } });
    return (
      <polygon
        key={p.id}
        role="button"
        tabIndex={0}
        aria-label={`Pièce ${p.nom}`}
        aria-pressed={choisie}
        points={points(p.contour)}
        fill={remplissage(p.sol)}
        className={choisie ? 'stroke-accent' : 'stroke-transparent'}
        strokeWidth={3}
        strokeDasharray="8 6"
        vectorEffect="non-scaling-stroke"
        onPointerDown={(ev) => {
          if (etat.outil !== 'selection') return;
          ev.stopPropagation();
          choisir();
        }}
        onKeyDown={activer(choisir)}
      />
    );
  });
}

/** Murs : leur emprise réelle (épaisseur), sélection et glisser parallèle (DES-09). */
function MursSvgBrut({
  niveau,
  etat,
  dispatch,
  demarrerGlisser,
}: Calque<'murs'> & { demarrerGlisser: (murId: string, ev: PointerEvent) => void }) {
  return niveau.murs.map((m) => {
    const choisi = etat.selection?.genre === 'mur' && etat.selection.id === m.id;
    const choisir = () => dispatch({ type: 'selectionner', selection: { genre: 'mur', id: m.id } });
    if (m.type === 'separation')
      return (
        <line
          key={m.id}
          x1={m.a.x}
          y1={m.a.y}
          x2={m.b.x}
          y2={m.b.y}
          stroke={COULEURS_PLAN.cote}
          strokeWidth={choisi ? 3 : 1.5}
          strokeDasharray="6 5"
          vectorEffect="non-scaling-stroke"
          role="button"
          tabIndex={0}
          aria-label={LIBELLES_MUR.separation}
          onPointerDown={(ev) => {
            if (etat.outil !== 'selection') return;
            ev.stopPropagation();
            choisir();
          }}
          onKeyDown={activer(choisir)}
        />
      );
    return (
      <polygon
        key={m.id}
        role="button"
        tabIndex={0}
        aria-label={`${LIBELLES_MUR[m.type]} de ${formatLongueur(longueurMur(m))}`}
        aria-pressed={choisi}
        points={points(contourMur(m))}
        fill={choisi ? COULEURS_PLAN.murSelection : COULEURS_PLAN.mur}
        className={etat.outil === 'selection' ? 'cursor-move' : undefined}
        onPointerDown={(ev) => {
          if (etat.outil !== 'selection') return;
          ev.stopPropagation();
          choisir();
          demarrerGlisser(m.id, ev);
        }}
        onKeyDown={activer(choisir)}
      />
    );
  });
}

/** Nom et surface de chaque pièce, au centre. */
export function EtiquettesPieces({
  niveau,
  etat,
  mmParPx,
}: {
  niveau: Niveau;
  etat: EtatEditeur;
  mmParPx: number;
}) {
  const taille = 14 * mmParPx;
  return niveau.pieces.map((p) => {
    const c = centroide(p.contour);
    return (
      <g key={p.id} pointerEvents="none" className="select-none">
        <text
          x={c.x}
          y={c.y}
          fontSize={taille}
          textAnchor="middle"
          className="fill-texte font-bold"
        >
          {p.nom}
        </text>
        {etat.calques.surfaces ? (
          <text
            x={c.x}
            y={c.y + taille * 1.3}
            fontSize={taille * 0.9}
            textAnchor="middle"
            className="fill-accent-700 font-semibold"
          >
            {formatSurface(surfaceCarrez(p))}
          </text>
        ) : null}
      </g>
    );
  });
}

export const MursSvg = memoCalque(MursSvgBrut, ['murs'], ['selection', 'outil']);

export const PiecesSvg = memoCalque(PiecesSvgBrut, ['pieces'], ['selection', 'outil']);
