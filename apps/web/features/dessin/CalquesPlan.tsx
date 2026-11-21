'use client';

import { memoCalque } from './memoCalque';
import {
  centreEtiquette,
  contoursRaccordes,
  formatLongueur,
  formatSurface,
  LIBELLES_MUR,
  longueurMur,
  surfaceCarrez,
  type Niveau,
} from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import type { Dispatch, PointerEvent } from 'react';
import { FaceChoisieSvg } from './FaceChoisieSvg';
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
  demarrerExtremite,
}: Calque<'murs'> & {
  demarrerGlisser: (murId: string, ev: PointerEvent) => void;
  /** Poignée d'une extrémité du mur choisi : la déplacer (DES-09). */
  demarrerExtremite: (murId: string, bout: 'a' | 'b', ev: PointerEvent) => void;
}) {
  // Angles fermés en onglet : les faces des murs se rejoignent exactement (DES-09).
  const contours = contoursRaccordes(niveau.murs);
  return niveau.murs.map((m) => {
    const choisi = etat.selection?.genre === 'mur' && etat.selection.id === m.id;
    // Une face choisie se montre seule : le mur garde sa couleur, la face est soulignée.
    const face = choisi ? etat.selection?.face : undefined;
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
      <g key={m.id}>
        <polygon
          role="button"
          tabIndex={0}
          aria-label={`${LIBELLES_MUR[m.type]} de ${formatLongueur(longueurMur(m))}`}
          aria-pressed={choisi}
          points={points(contours.get(m.id)!)}
          fill={choisi && !face ? COULEURS_PLAN.murSelection : COULEURS_PLAN.mur}
          // Liseré de la même couleur : aucun fil clair entre deux murs raccordés en onglet.
          stroke={choisi && !face ? COULEURS_PLAN.murSelection : COULEURS_PLAN.mur}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          className={etat.outil === 'selection' ? 'cursor-move' : undefined}
          onPointerDown={(ev) => {
            if (etat.outil !== 'selection') return;
            ev.stopPropagation();
            choisir();
            demarrerGlisser(m.id, ev);
          }}
          onKeyDown={activer(choisir)}
        />
        {face ? (
          <FaceChoisieSvg niveau={niveau} murId={m.id} face={face} s={etat.selection?.s} />
        ) : null}
        {choisi && etat.outil === 'selection'
          ? (['a', 'b'] as const).map((bout) => (
              <circle
                key={bout}
                cx={m[bout].x}
                cy={m[bout].y}
                r={m.epaisseur / 2 + 80}
                fill="white"
                className="cursor-grab stroke-accent"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                aria-label={`Extrémité ${bout === 'a' ? 'de départ' : 'de fin'} du mur`}
                data-testid={`extremite-${bout}`}
                onPointerDown={(ev) => {
                  ev.stopPropagation();
                  demarrerExtremite(m.id, bout, ev);
                }}
              />
            ))
          : null}
      </g>
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
  // Deux lignes centrées ensemble sur le point le plus dégagé de la pièce.
  const ecart = etat.calques.surfaces ? taille * 0.65 : 0;
  return niveau.pieces.map((p) => {
    const c = centreEtiquette(p.contour);
    return (
      <g key={p.id} pointerEvents="none" className="select-none">
        <text
          x={c.x}
          y={c.y - ecart}
          fontSize={taille}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-texte font-bold"
        >
          {p.nom}
        </text>
        {etat.calques.surfaces ? (
          <text
            x={c.x}
            y={c.y + ecart}
            fontSize={taille * 0.9}
            textAnchor="middle"
            dominantBaseline="central"
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
