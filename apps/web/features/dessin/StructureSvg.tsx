'use client';

import {
  CATALOGUE_OUVERTURES,
  contourMur,
  contoursRaccordes,
  emprise,
  longueurMur,
  longueurVolee,
  marchesDroites,
  versInterieur,
  type Niveau,
  type Point,
} from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import type { Dispatch, PointerEvent } from 'react';
import type { Action, EtatEditeur } from './etat';
import { memoCalque } from './memoCalque';
import { activer, points } from './svg';
import { add, Symbole, trait } from './SymboleOuverture';

/** Ouvertures : trou dans le mur + symbole ; sélectionnables (DES-13). */
function OuverturesSvgBrut({
  niveau,
  etat,
  dispatch,
  demarrerOuverture: demarrerGlisser,
  demarrerBordOuverture: demarrerBord,
}: {
  niveau: Pick<Niveau, 'ouvertures' | 'murs' | 'pieces'>;
  etat: Pick<EtatEditeur, 'selection' | 'outil' | 'trace'>;
  dispatch: Dispatch<Action>;
  /** Glisser la porte ou fenêtre choisie le long de son mur (DES-14). */
  demarrerOuverture?: (id: string, ev: PointerEvent) => void;
  /** Poignée d'un bord de la menuiserie choisie : l'agrandir ou la rétrécir (DES-14). */
  demarrerBordOuverture?: (id: string, bord: 'debut' | 'fin', ev: PointerEvent) => void;
}) {
  return niveau.ouvertures.map((o) => {
    const m = niveau.murs.find((x) => x.id === o.murId);
    if (!m) return null;
    const l = longueurMur(m);
    const u = { x: (m.b.x - m.a.x) / l, y: (m.b.y - m.a.y) / l };
    const trou = contourMur({
      ...m,
      a: add(m.a, u, o.position),
      b: add(m.a, u, o.position + o.largeur),
      epaisseur: m.epaisseur + 4,
    });
    const choisie = etat.selection?.genre === 'ouverture' && etat.selection.id === o.id;
    // Une menuiserie posée se fait glisser le long de son mur, aussi juste après sa pose.
    const mobile =
      etat.outil === 'selection' || (etat.outil === 'ouverture' && etat.trace === null);
    const choisir = () =>
      dispatch({ type: 'selectionner', selection: { genre: 'ouverture', id: o.id } });
    return (
      <g key={o.id}>
        <g
          role="button"
          tabIndex={0}
          aria-label={`${CATALOGUE_OUVERTURES[o.type].libelle} de ${Math.round(o.largeur / 10)} cm`}
          aria-pressed={choisie}
          className={`${choisie ? 'stroke-accent' : 'stroke-texte'} ${mobile ? 'cursor-move' : ''}`}
          onPointerDown={(ev) => {
            if (!mobile) return;
            ev.stopPropagation();
            choisir();
            demarrerGlisser?.(o.id, ev);
          }}
          onKeyDown={activer(choisir)}
        >
          <polygon points={points(trou)} fill={COULEURS_PLAN.pieceVide} stroke="none" />
          <Symbole o={o} m={m} versInterieur={versInterieur(niveau, m, o)} />
        </g>
        {choisie && mobile && demarrerBord
          ? (['debut', 'fin'] as const).map((bord) => {
              const c = add(m.a, u, bord === 'debut' ? o.position : o.position + o.largeur);
              return (
                <circle
                  key={bord}
                  cx={c.x}
                  cy={c.y}
                  r={m.epaisseur / 2 + 60}
                  fill="white"
                  className="cursor-ew-resize stroke-accent"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  aria-label={`Bord ${bord === 'debut' ? 'de début' : 'de fin'} : agrandir ou rétrécir`}
                  data-testid={`bord-ouverture-${bord}`}
                  onPointerDown={(ev) => {
                    ev.stopPropagation();
                    demarrerBord(o.id, bord, ev);
                  }}
                />
              );
            })
          : null}
      </g>
    );
  });
}

/** Escaliers : emprise, marches, sens de montée (DES-15). */
function EscaliersSvgBrut({
  niveau,
  etat,
  dispatch,
}: {
  niveau: Pick<Niveau, 'escaliers'>;
  etat: Pick<EtatEditeur, 'selection' | 'outil'>;
  dispatch: Dispatch<Action>;
}) {
  return niveau.escaliers.map((e) => {
    const choisi = etat.selection?.genre === 'escalier' && etat.selection.id === e.id;
    const choisir = () =>
      dispatch({ type: 'selectionner', selection: { genre: 'escalier', id: e.id } });
    const contour = emprise(e);
    return (
      <g
        key={e.id}
        role="button"
        tabIndex={0}
        aria-label={`Escalier de ${e.nbMarches} marches`}
        aria-pressed={choisi}
        className={choisi ? 'stroke-accent' : 'stroke-texte'}
        onPointerDown={(ev) => {
          if (etat.outil !== 'selection') return;
          ev.stopPropagation();
          choisir();
        }}
        onKeyDown={activer(choisir)}
      >
        <polygon
          points={points(contour)}
          {...trait}
          fill={COULEURS_PLAN.etiquette}
          strokeWidth={choisi ? 3 : 1.5}
        />
        {marchesDroites(e).map(([p, q], i) => (
          <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} {...trait} strokeWidth={1} />
        ))}
        <title>{`Escalier, ${Math.round(longueurVolee(e) / 10)} cm de volée`}</title>
      </g>
    );
  });
}

/** Calques mémorisés : redessinés seulement si leurs données changent (glisser un meuble). */
export const OuverturesSvg = memoCalque(
  OuverturesSvgBrut,
  ['ouvertures', 'murs', 'pieces'],
  ['selection', 'outil', 'trace'],
);
export const EscaliersSvg = memoCalque(EscaliersSvgBrut, ['escaliers'], ['selection', 'outil']);

/** Niveau du dessous en transparence et trémies du niveau courant (DES-05). */
export function ReperesNiveauSvg({
  dessous,
  tremies,
}: {
  dessous: Niveau | null;
  tremies: Point[][];
}) {
  const contours = contoursRaccordes(dessous?.murs ?? []);
  return (
    <g pointerEvents="none">
      {dessous?.murs.map((m) => (
        <polygon
          key={m.id}
          points={points(contours.get(m.id)!)}
          fill={COULEURS_PLAN.mur}
          opacity={0.15}
        />
      ))}
      {tremies.map((t, i) => (
        <polygon
          key={i}
          points={points(t)}
          className="stroke-danger"
          {...trait}
          strokeDasharray="8 6"
        />
      ))}
    </g>
  );
}
