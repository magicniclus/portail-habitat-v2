'use client';

import { cotesMurs, formatLongueur, type CoteMur, type Niveau } from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import { useMemo, type Dispatch } from 'react';
import type { Action, EtatEditeur } from './etat';
import { memoCalque } from './memoCalque';

const trait = { stroke: COULEURS_PLAN.coteTrait, vectorEffect: 'non-scaling-stroke' as const };

/** Boîte occupée par un texte orienté (mm) : sert à écarter les cotes qui se chevauchent. */
type Boite = { x0: number; y0: number; x1: number; y1: number };
function boite(c: CoteMur, largeur: number, hauteur: number): Boite {
  const r = (c.angle * Math.PI) / 180;
  const [dx, dy] = [
    (Math.abs(Math.cos(r)) * largeur + Math.abs(Math.sin(r)) * hauteur) / 2,
    (Math.abs(Math.sin(r)) * largeur + Math.abs(Math.cos(r)) * hauteur) / 2,
  ];
  return { x0: c.centre.x - dx, y0: c.centre.y - dy, x1: c.centre.x + dx, y1: c.centre.y + dy };
}
const recouvre = (a: Boite, b: Boite) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/**
 * Cotes des murs (DES-10), à la manière d'un plan d'architecte : façades cotées dehors avec
 * lignes d'attache et traits obliques, murs intérieurs cotés contre leur face ; texte le long
 * du mur. Une cote qui ne tient pas sur son mur ou en chevauche une autre est masquée (on la
 * retrouve en sélectionnant le mur). Clic : sélectionne le mur pour modifier sa longueur.
 */
function CotesBrut({
  niveau,
  mmParPx,
  etat,
  dispatch,
}: {
  niveau: Pick<Niveau, 'murs' | 'pieces'>;
  etat: Pick<EtatEditeur, 'outil' | 'selection'>;
  mmParPx: number;
  dispatch: Dispatch<Action>;
}) {
  // Hors de l'outil Sélection, les cotes laissent passer les clics du tracé ; la cote du mur
  // sélectionné est toujours affichée.
  const cliquables = etat.outil === 'selection';
  const choisi = etat.selection?.genre === 'mur' ? etat.selection.id : null;
  const taille = 11 * mmParPx;
  const cotes = useMemo(() => {
    const toutes = cotesMurs(niveau, 28 * mmParPx);
    // Priorité : le mur choisi, puis les façades, puis les plus longs murs.
    const triees = [...toutes].sort(
      (x, y) =>
        Number(y.murId === choisi) - Number(x.murId === choisi) ||
        Number(y.exterieure) - Number(x.exterieure) ||
        y.longueur - x.longueur,
    );
    const prises: Boite[] = [];
    return triees.filter((c) => {
      const texte = formatLongueur(c.longueur);
      const largeur = texte.length * taille * 0.6;
      if (c.murId !== choisi && largeur > c.longueur * 0.85) return false;
      const b = boite(c, largeur, taille * 1.3);
      if (c.murId !== choisi && prises.some((p) => recouvre(p, b))) return false;
      prises.push(b);
      return true;
    });
  }, [niveau, mmParPx, taille, choisi]);
  const tic = 4 * mmParPx;
  return (
    <g data-testid="cotes">
      {cotes.map((c) => {
        const l = Math.hypot(c.b.x - c.a.x, c.b.y - c.a.y) || 1;
        const [ux, uy] = [(c.b.x - c.a.x) / l, (c.b.y - c.a.y) / l];
        // Traits obliques à 45° sur les extrémités de la ligne de cote.
        const oblique = (p: { x: number; y: number }) => (
          <line
            x1={p.x - (ux - uy) * tic}
            y1={p.y - (uy + ux) * tic}
            x2={p.x + (ux - uy) * tic}
            y2={p.y + (uy + ux) * tic}
            {...trait}
            strokeWidth={1.2}
          />
        );
        return (
          <g
            key={c.murId}
            role="button"
            aria-label={`Cote ${formatLongueur(c.longueur)}`}
            pointerEvents={cliquables ? undefined : 'none'}
            className="cursor-pointer"
            onPointerDown={(ev) => {
              ev.stopPropagation();
              dispatch({ type: 'selectionner', selection: { genre: 'mur', id: c.murId } });
            }}
          >
            {c.exterieure ? (
              <>
                <line
                  x1={c.attacheA.x}
                  y1={c.attacheA.y}
                  x2={c.a.x}
                  y2={c.a.y}
                  {...trait}
                  strokeWidth={0.8}
                />
                <line
                  x1={c.attacheB.x}
                  y1={c.attacheB.y}
                  x2={c.b.x}
                  y2={c.b.y}
                  {...trait}
                  strokeWidth={0.8}
                />
                <line x1={c.a.x} y1={c.a.y} x2={c.b.x} y2={c.b.y} {...trait} strokeWidth={1} />
                {oblique(c.a)}
                {oblique(c.b)}
              </>
            ) : null}
            <text
              transform={`translate(${c.centre.x} ${c.centre.y}) rotate(${c.angle})`}
              y={c.exterieure ? -taille * 0.35 : taille * 0.35}
              fontSize={taille}
              textAnchor="middle"
              fill={COULEURS_PLAN.cote}
              className={`select-none ${c.murId === choisi ? 'font-bold' : 'font-semibold'}`}
            >
              {formatLongueur(c.longueur)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Ne se redessine que si les murs, les pièces, l'outil ou la sélection changent (DES-48). */
export const Cotes = memoCalque(CotesBrut, ['murs', 'pieces'], ['outil', 'selection']);
