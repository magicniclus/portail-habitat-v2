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
export function Vignette({ vue, children }: { vue: string; children: ReactNode }) {
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
const trait = { stroke: COULEURS_PLAN.mur, strokeWidth: 1.4, fill: 'none' } as const;
const fin = { stroke: COULEURS_PLAN.mur, strokeWidth: 0.7 } as const;

/** Hachures à 45° dans un rectangle (coupe d'une maçonnerie, convention du dessin de bâtiment). */
function Hachures({
  x,
  y,
  l,
  h,
  pas,
}: {
  x: number;
  y: number;
  l: number;
  h: number;
  pas: number;
}) {
  const traits = [];
  for (let d = -h; d < l; d += pas) {
    const [x1, y1] = [x + Math.max(d, 0), y + h - Math.max(-d, 0)];
    const [x2, y2] = [x + Math.min(d + h, l), y + h - Math.min(h, l - d)];
    traits.push(<line key={d} x1={x1} y1={y1} x2={x2} y2={y2} {...fin} />);
  }
  return <g>{traits}</g>;
}

/** Coupe en plan : épaisseur cotée par deux traits forts et des hachures. */
function Coupe({ ep, pas }: { ep: number; pas: number }) {
  const y = 20 - ep / 2;
  return (
    <g>
      <Hachures x={4} y={y} l={32} h={ep} pas={pas} />
      <line x1={4} y1={y} x2={36} y2={y} {...trait} />
      <line x1={4} y1={y + ep} x2={36} y2={y + ep} {...trait} />
      {/* Cote d'épaisseur. */}
      <line x1={38} y1={y} x2={38} y2={y + ep} {...fin} />
      <line x1={36.5} y1={y} x2={39.5} y2={y} {...fin} />
      <line x1={36.5} y1={y + ep} x2={39.5} y2={y + ep} {...fin} />
    </g>
  );
}

/** Élévation : mur bas plein, hauteur d'étage en pointillés, cote de hauteur. */
function Elevation({ h }: { h: number }) {
  return (
    <g>
      <rect x={6} y={6} width={26} height={28} {...trait} strokeWidth={0.8} strokeDasharray="2 2" />
      <rect x={6} y={34 - h} width={26} height={h} {...plein} />
      <line x1={3} y1={34} x2={37} y2={34} {...trait} />
      <line x1={35.5} y1={34 - h} x2={35.5} y2={34} {...fin} />
      <line x1={34} y1={34 - h} x2={37} y2={34 - h} {...fin} />
    </g>
  );
}

/**
 * Murs & cloisons en pictogrammes techniques : coupes hachurées à l'épaisseur (mur, cloison),
 * élévations cotées (demi-mur, muret), trait d'axe (séparation), section de poteau, poutre en
 * traits cachés (au-dessus du plan de coupe).
 */
export function ApercuMur({ type }: { type: TypeMur }) {
  const dessin: Record<TypeMur, ReactNode> = {
    mur: <Coupe ep={12} pas={3} />,
    cloison: <Coupe ep={5} pas={2.5} />,
    demi_mur: <Elevation h={14} />,
    muret: <Elevation h={7} />,
    separation: (
      <g>
        <rect x={3} y={8} width={34} height={24} fill={COULEURS_PLAN.fond} />
        <line x1={20} y1={4} x2={20} y2={36} {...trait} strokeDasharray="7 2 1.5 2" />
      </g>
    ),
    poteau: (
      <g>
        <rect x={13} y={13} width={14} height={14} {...trait} />
        <Hachures x={13} y={13} l={14} h={14} pas={2.5} />
        <line x1={4} y1={20} x2={36} y2={20} {...fin} strokeDasharray="5 1.5 1 1.5" />
        <line x1={20} y1={4} x2={20} y2={36} {...fin} strokeDasharray="5 1.5 1 1.5" />
      </g>
    ),
    poutre: (
      <g>
        <rect x={3} y={15} width={34} height={10} {...trait} strokeDasharray="3 2" />
        <line x1={3} y1={20} x2={37} y2={20} {...fin} strokeDasharray="6 1.5 1 1.5" />
      </g>
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
        <SymboleObjetSvg
          symbole={o.symbole}
          style={o.style}
          l={l}
          p={p}
          couleur={COULEURS_PLAN.etiquette}
        />
      </g>
    </Vignette>
  );
}
