import {
  CATALOGUE_OUVERTURES,
  zonesCoulissement,
  type Mur,
  type ObjetCatalogue,
  type Ouverture,
  type TypeMur,
  type TypeOuverture,
} from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import type { ReactNode } from 'react';
import { SymboleObjetSvg } from './SymboleObjet';
import { Symbole } from './SymboleOuverture';

/** Vignette carrée devant une ligne de menu : ce qu'on va poser, vu comme sur le plan. */
function Vignette({ vue, children }: { vue: string; children: ReactNode }) {
  return (
    <svg
      viewBox={vue}
      aria-hidden="true"
      className="size-11 shrink-0 rounded-lg border border-neutre-200 bg-blanc p-1"
    >
      {children}
    </svg>
  );
}

const plein = { fill: COULEURS_PLAN.mur };

/** Murs & cloisons : épaisseur et nature du mur en un coup d'œil. */
export function ApercuMur({ type }: { type: TypeMur }) {
  const barre = (h: number, opacite = 1) => (
    <rect x={3} y={20 - h / 2} width={34} height={h} rx={1} opacity={opacite} {...plein} />
  );
  const dessin: Record<TypeMur, ReactNode> = {
    mur: barre(12),
    cloison: barre(5),
    demi_mur: barre(10, 0.55),
    muret: barre(6, 0.35),
    separation: (
      <line
        x1={3}
        y1={20}
        x2={37}
        y2={20}
        stroke={COULEURS_PLAN.cote}
        strokeWidth={2}
        strokeDasharray="4 3"
      />
    ),
    poteau: <rect x={13} y={13} width={14} height={14} {...plein} />,
    poutre: (
      <rect
        x={3}
        y={15}
        width={34}
        height={10}
        fill="none"
        stroke={COULEURS_PLAN.mur}
        strokeWidth={2}
        strokeDasharray="5 3"
      />
    ),
  };
  return <Vignette vue="0 0 40 40">{dessin[type]}</Vignette>;
}

/** Portes et fenêtres : le symbole normalisé, avec son arc ou son rail. */
export function ApercuOuverture({ type }: { type: TypeOuverture }) {
  const c = CATALOGUE_OUVERTURES[type];
  const o = {
    id: 'apercu',
    murId: 'apercu',
    largeur: c.largeur,
    hauteur: c.hauteur,
    allege: 0,
    type,
    sens: 'gauche',
    cote: 'interieur',
    volet: null,
  } as unknown as Ouverture;
  const glisse = zonesCoulissement({ ...o, position: 0 }).length > 0;
  const position = glisse ? c.largeur + 200 : 200;
  const l = glisse ? 3 * c.largeur + 400 : c.largeur + 400;
  const m = {
    id: 'apercu',
    type: 'mur',
    a: { x: 0, y: 0 },
    b: { x: l, y: 0 },
    epaisseur: 200,
    hauteur: 2500,
    alignement: 'axe',
  } as Mur;
  const cote = Math.max(l, c.largeur + 400);
  return (
    <Vignette vue={`0 ${-cote / 2 + c.largeur / 2} ${cote} ${cote}`}>
      <rect x={0} y={-100} width={position} height={200} {...plein} />
      <rect
        x={position + c.largeur}
        y={-100}
        width={l - position - c.largeur}
        height={200}
        {...plein}
      />
      <g className="stroke-texte">
        <Symbole o={{ ...o, position }} m={m} versInterieur={1} />
      </g>
    </Vignette>
  );
}

/** Équipements : le symbole vu de dessus, à ses proportions. */
export function ApercuObjet({ o }: { o: ObjetCatalogue }) {
  const { l, p } = o.dimensions;
  const cote = Math.max(l, p) * 1.15;
  return (
    <Vignette vue={`${-cote / 2} ${-cote / 2} ${cote} ${cote}`}>
      <g className="stroke-texte">
        <SymboleObjetSvg symbole={o.symbole} l={l} p={p} couleur={COULEURS_PLAN.etiquette} />
      </g>
    </Vignette>
  );
}
