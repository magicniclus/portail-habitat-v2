import { COULEURS_EXTERIEUR as C, COULEURS_PLAN } from '@ph/ui/tokens';
import type { ReactNode } from 'react';
import { Vignette } from './Apercus';
import type { ElementExterieur } from './etat';

const contour = { stroke: COULEURS_PLAN.mur, strokeWidth: 1.2 } as const;

/** Arbre ou arbuste vu de dessus : houppier festonné, tronc au centre. */
function Houppier({ r }: { r: number }) {
  const lobes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  return (
    <g>
      {lobes.map((a) => (
        <circle
          key={a}
          cx={20 + Math.cos(a) * r * 0.55}
          cy={20 + Math.sin(a) * r * 0.55}
          r={r * 0.5}
          fill={C.vegetal}
        />
      ))}
      <circle cx={20} cy={20} r={r * 0.6} fill={C.vegetal} />
      <circle cx={20} cy={20} r={2} fill={C.tronc} />
    </g>
  );
}

const DESSINS: Record<ElementExterieur, ReactNode> = {
  // Lames de bois posées côte à côte.
  terrasse: (
    <g>
      <rect x={5} y={7} width={30} height={26} fill={C.margelle} {...contour} />
      {[11, 17, 23, 29].map((x) => (
        <line key={x} x1={x} y1={7} x2={x} y2={33} stroke={C.cloture} strokeWidth={0.6} />
      ))}
    </g>
  ),
  piscine: (
    <g>
      <rect x={5} y={9} width={30} height={22} rx={2} fill={C.margelle} {...contour} />
      <rect x={9} y={13} width={22} height={14} rx={1} fill={C.eau} />
      <path d="M11 18 q3 -2 6 0 t6 0 t6 0" stroke={C.eauFonce} strokeWidth={0.8} fill="none" />
    </g>
  ),
  allee: (
    <g>
      <path d="M8 36 C12 24 26 20 32 4" stroke={C.allee} strokeWidth={9} fill="none" />
      <path
        d="M8 36 C12 24 26 20 32 4"
        stroke={COULEURS_PLAN.mur}
        strokeWidth={0.6}
        strokeDasharray="2 2"
        fill="none"
      />
    </g>
  ),
  // Poteaux reliés par des lisses.
  cloture: (
    <g>
      <line x1={4} y1={20} x2={36} y2={20} stroke={C.cloture} strokeWidth={1.6} />
      {[6, 14, 22, 30].map((x) => (
        <rect key={x} x={x - 1.5} y={17} width={3} height={6} fill={C.cloture} />
      ))}
    </g>
  ),
  arbre: <Houppier r={15} />,
  arbuste: <Houppier r={9} />,
  // Pieds de haie alignés.
  haie: (
    <g>
      {[8, 16, 24, 32].map((x) => (
        <circle key={x} cx={x} cy={20} r={5} fill={C.vegetalFonce} />
      ))}
    </g>
  ),
  // Limite de propriété : tirets et bornes aux angles.
  parcelle: (
    <g>
      <rect
        x={6}
        y={8}
        width={28}
        height={24}
        fill={C.gazon}
        stroke={C.parcelle}
        strokeWidth={1.4}
        strokeDasharray="4 2"
      />
      {[
        [6, 8],
        [34, 8],
        [34, 32],
        [6, 32],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1.8} fill={C.parcelle} />
      ))}
    </g>
  ),
};

/** Extérieur : ce qu'on va poser, vu de dessus comme sur le plan. */
export function ApercuExterieur({ element }: { element: ElementExterieur }) {
  return <Vignette vue="0 0 40 40">{DESSINS[element]}</Vignette>;
}
