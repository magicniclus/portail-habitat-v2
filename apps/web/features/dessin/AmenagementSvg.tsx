'use client';

import { memoCalque } from './memoCalque';
import { objetDuCatalogue, planDeTravail, type Niveau } from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import type { Dispatch, PointerEvent } from 'react';
import type { Action, EtatEditeur } from './etat';
import { remplissage } from './Motifs';
import { activer, points } from './svg';
import { SymboleObjetSvg } from './SymboleObjet';

const trait = { vectorEffect: 'non-scaling-stroke' as const, strokeWidth: 1.5 };

/** Zones décoratives au sol (DES-27), au-dessus du sol de la pièce. */
export function ZonesSvg({
  niveau,
  etat,
  dispatch,
}: {
  niveau: Niveau;
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
}) {
  return niveau.zonesDeco
    .filter((z) => z.support.genre === 'piece')
    .map((z) => {
      const choisie = etat.selection?.genre === 'zone' && etat.selection.id === z.id;
      const choisir = () =>
        dispatch({ type: 'selectionner', selection: { genre: 'zone', id: z.id } });
      return (
        <polygon
          key={z.id}
          role="button"
          tabIndex={0}
          aria-label="Zone décorative"
          aria-pressed={choisie}
          points={points(z.contour)}
          fill={remplissage(z.revetement)}
          className={choisie ? 'stroke-accent' : 'stroke-neutre-400'}
          {...trait}
          strokeWidth={choisie ? 2.5 : 1}
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

/** Mobilier et équipements (DES-22) : symboles, plan de travail, sélection et glisser. */
function ObjetsSvgBrut({
  niveau,
  etat,
  dispatch,
  demarrerGlisser,
}: {
  niveau: Pick<Niveau, 'objets'>;
  etat: Pick<EtatEditeur, 'selection' | 'outil'>;
  dispatch: Dispatch<Action>;
  demarrerGlisser: (id: string, ev: PointerEvent) => void;
}) {
  // Les objets en hauteur (meubles hauts, luminaires) passent au-dessus des autres.
  const tries = [...niveau.objets].sort((a, b) => a.altitude - b.altitude);
  return (
    <g>
      {planDeTravail(niveau).contours.map((c, i) => (
        <polygon
          key={i}
          points={points(c)}
          fill={COULEURS_PLAN.etiquetteTrait}
          stroke="none"
          pointerEvents="none"
        />
      ))}
      {tries.map((o) => {
        const c = objetDuCatalogue(o.catalogueId);
        const choisi = etat.selection?.genre === 'objet' && etat.selection.id === o.id;
        const choisir = () =>
          dispatch({ type: 'selectionner', selection: { genre: 'objet', id: o.id } });
        const couleur = o.materiaux.facade ?? o.materiaux.principal ?? COULEURS_PLAN.etiquette;
        return (
          <g
            key={o.id}
            role="button"
            tabIndex={0}
            aria-label={c?.libelle ?? 'Objet'}
            aria-pressed={choisi}
            transform={`translate(${o.position.x} ${o.position.y}) rotate(${o.rotation / 10})`}
            className={`${choisi ? 'stroke-accent' : 'stroke-texte'} ${etat.outil === 'selection' ? 'cursor-move' : ''}`}
            onPointerDown={(ev) => {
              if (etat.outil !== 'selection') return;
              ev.stopPropagation();
              choisir();
              demarrerGlisser(o.id, ev);
            }}
            onKeyDown={activer(choisir)}
          >
            <SymboleObjetSvg
              symbole={c?.symbole ?? 'rectangle'}
              l={o.dimensions.l}
              p={o.dimensions.p}
              couleur={couleur}
            />
            {choisi ? (
              <rect
                x={-o.dimensions.l / 2 - 40}
                y={-o.dimensions.p / 2 - 40}
                width={o.dimensions.l + 80}
                height={o.dimensions.p + 80}
                fill="none"
                className="stroke-accent"
                {...trait}
                strokeDasharray="6 4"
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

export const ObjetsSvg = memoCalque(ObjetsSvgBrut, ['objets'], ['selection', 'outil']);
