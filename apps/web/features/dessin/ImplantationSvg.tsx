'use client';

import {
  coinsOrthophoto,
  distancesAuxLimites,
  formatLongueur,
  milieu,
  type Scene,
} from '@ph/core/dessin';
import { COULEURS_EXTERIEUR as C, COULEURS_PLAN } from '@ph/ui/tokens';
import type { FondCharge } from './useFond';

/**
 * Implantation en 2D (DES-35) : photo aérienne IGN sous tout le dessin, cotes de la maison aux
 * limites de la parcelle et flèche du nord dans le coin du plan.
 */
export function OrthophotoSvg({ scene, image }: { scene: Scene; image: FondCharge | null }) {
  const coins = coinsOrthophoto(scene);
  if (!coins || !image) return null;
  const l = Math.hypot(coins.hd.x - coins.hg.x, coins.hd.y - coins.hg.y);
  const h = Math.hypot(coins.bg.x - coins.hg.x, coins.bg.y - coins.hg.y);
  return (
    <image
      href={image.url}
      x={0}
      y={0}
      width={l}
      height={h}
      transform={`translate(${coins.hg.x} ${coins.hg.y}) rotate(${scene.orientationNord / 10})`}
      preserveAspectRatio="none"
      pointerEvents="none"
      data-testid="photo-aerienne"
    />
  );
}

export function LimitesSvg({
  scene,
  mmParPx,
  coin,
}: {
  scene: Scene;
  mmParPx: number;
  /** Coin haut-droit du cadre : la flèche du nord s'y place. */
  coin: { x: number; y: number };
}) {
  const taille = 12 * mmParPx;
  const r = 22 * mmParPx;
  const centre = { x: coin.x - r * 1.6, y: coin.y + r * 1.6 };
  return (
    <g pointerEvents="none">
      {scene.terrain
        ? distancesAuxLimites(scene).map((c, i) => {
            const m = milieu(c.a, c.b);
            const texte = formatLongueur(c.d);
            return (
              <g key={i} data-testid="cote-limite">
                <line
                  x1={c.a.x}
                  y1={c.a.y}
                  x2={c.b.x}
                  y2={c.b.y}
                  stroke={C.limite}
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={m.x - texte.length * taille * 0.3}
                  y={m.y - taille * 0.75}
                  width={texte.length * taille * 0.6}
                  height={taille * 1.5}
                  rx={taille * 0.75}
                  fill={COULEURS_PLAN.etiquette}
                  stroke={C.limite}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={m.x}
                  y={m.y + taille * 0.35}
                  fontSize={taille}
                  textAnchor="middle"
                  fill={C.limite}
                  className="font-semibold select-none"
                >
                  {texte}
                </text>
              </g>
            );
          })
        : null}
      <g
        transform={`translate(${centre.x} ${centre.y}) rotate(${scene.orientationNord / 10})`}
        aria-label="Nord"
        data-testid="fleche-nord"
      >
        <circle
          r={r}
          fill={COULEURS_PLAN.etiquette}
          stroke={COULEURS_PLAN.etiquetteTrait}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={`M0 ${-r * 0.8} L${r * 0.35} ${r * 0.45} L0 ${r * 0.2} L${-r * 0.35} ${r * 0.45} Z`}
          fill={C.nord}
        />
        <text
          y={-r * 1.15}
          fontSize={taille}
          textAnchor="middle"
          fill={C.nord}
          className="font-bold select-none"
        >
          N
        </text>
      </g>
    </g>
  );
}
