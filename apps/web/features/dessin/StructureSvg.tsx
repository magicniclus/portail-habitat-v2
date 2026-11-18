'use client';

import {
  CATALOGUE_OUVERTURES,
  contourMur,
  emprise,
  longueurMur,
  longueurVolee,
  pointDansPolygone,
  type Escalier,
  type Mur,
  type Ouverture,
  type Niveau,
  type Point,
} from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import type { Dispatch } from 'react';
import type { Action, EtatEditeur } from './etat';
import { activer, points } from './svg';
import { add, Symbole, trait } from './SymboleOuverture';

/** Côté pièce d'une ouverture : on teste un point juste devant le milieu de l'ouverture. */
function versInterieur(niveau: Niveau, m: Mur, o: Ouverture): 1 | -1 {
  const l = longueurMur(m);
  const u = { x: (m.b.x - m.a.x) / l, y: (m.b.y - m.a.y) / l };
  const nv = { x: -u.y, y: u.x };
  const devant = add(add(m.a, u, o.position + o.largeur / 2), nv, m.epaisseur / 2 + 100);
  return niveau.pieces.some((p) => pointDansPolygone(devant, p.contour)) ? 1 : -1;
}

/** Ouvertures : trou dans le mur + symbole ; sélectionnables (DES-13). */
export function OuverturesSvg({
  niveau,
  etat,
  dispatch,
}: {
  niveau: Niveau;
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
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
    const choisir = () =>
      dispatch({ type: 'selectionner', selection: { genre: 'ouverture', id: o.id } });
    return (
      <g
        key={o.id}
        role="button"
        tabIndex={0}
        aria-label={`${CATALOGUE_OUVERTURES[o.type].libelle} de ${Math.round(o.largeur / 10)} cm`}
        aria-pressed={choisie}
        className={choisie ? 'stroke-accent' : 'stroke-texte'}
        onPointerDown={(ev) => {
          if (etat.outil !== 'selection') return;
          ev.stopPropagation();
          choisir();
        }}
        onKeyDown={activer(choisir)}
      >
        <polygon points={points(trou)} fill={COULEURS_PLAN.pieceVide} stroke="none" />
        <Symbole o={o} m={m} versInterieur={versInterieur(niveau, m, o)} />
      </g>
    );
  });
}

/** Marches d'un escalier droit (ou d'une échelle), dans le repère de l'escalier. */
function marches(e: Escalier): [Point, Point][] {
  if (e.type !== 'droit' && e.type !== 'meunier') return [];
  const a = (e.rotation / 10) * (Math.PI / 180);
  const place = (p: Point) => ({
    x: e.position.x + p.x * Math.cos(a) - p.y * Math.sin(a),
    y: e.position.y + p.x * Math.sin(a) + p.y * Math.cos(a),
  });
  return Array.from({ length: e.nbMarches - 2 }, (_, i) => {
    const y = (i + 1) * e.giron;
    return [place({ x: 0, y }), place({ x: e.largeur, y })];
  });
}

/** Escaliers : emprise, marches, sens de montée (DES-15). */
export function EscaliersSvg({
  niveau,
  etat,
  dispatch,
}: {
  niveau: Niveau;
  etat: EtatEditeur;
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
        {marches(e).map(([p, q], i) => (
          <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} {...trait} strokeWidth={1} />
        ))}
        <title>{`Escalier, ${Math.round(longueurVolee(e) / 10)} cm de volée`}</title>
      </g>
    );
  });
}

/** Niveau du dessous en transparence et trémies du niveau courant (DES-05). */
export function ReperesNiveauSvg({
  dessous,
  tremies,
}: {
  dessous: Niveau | null;
  tremies: Point[][];
}) {
  return (
    <g pointerEvents="none">
      {dessous?.murs.map((m) => (
        <polygon
          key={m.id}
          points={points(contourMur(m))}
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
