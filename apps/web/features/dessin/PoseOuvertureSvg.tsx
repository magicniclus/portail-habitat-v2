import {
  CATALOGUE_OUVERTURES,
  contourMur,
  formatLongueur,
  ouvertureTiree,
  pointSurMur,
  versInterieur,
  type Niveau,
  type Ouverture,
  type Point,
  type TypeOuverture,
} from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import { points } from './svg';
import { Symbole } from './SymboleOuverture';

/**
 * Menuiserie en cours de pose (DES-14) : entre le premier clic et le pointeur, le trou dans le
 * mur, l'ouvrant du côté du pointeur et la largeur, tels qu'ils seront posés au second clic.
 */
export function PoseOuvertureSvg({
  niveau,
  type,
  premier,
  pointeur,
  mmParPx,
}: {
  niveau: Niveau;
  type: TypeOuverture;
  premier: Point;
  pointeur: Point;
  mmParPx: number;
}) {
  const t = ouvertureTiree(niveau, type, premier, pointeur);
  const m = t && niveau.murs.find((x) => x.id === t.murId);
  if (!t || !m) return null;
  const c = CATALOGUE_OUVERTURES[type];
  const o = { ...t, id: 'apercu', type, hauteur: c.hauteur, allege: c.allege } as Ouverture;
  const [a, b] = [pointSurMur(m, t.position), pointSurMur(m, t.position + t.largeur)];
  const taille = 12 * mmParPx;
  return (
    <g pointerEvents="none" className="stroke-accent" data-testid="pose-ouverture">
      <polygon
        points={points(contourMur({ ...m, a, b, epaisseur: m.epaisseur + 4 }))}
        fill={COULEURS_PLAN.pieceVide}
        stroke="none"
      />
      <Symbole o={o} m={m} versInterieur={versInterieur(niveau, m, o)} />
      <text
        x={(a.x + b.x) / 2}
        y={(a.y + b.y) / 2 - m.epaisseur / 2 - taille}
        fontSize={taille}
        textAnchor="middle"
        dominantBaseline="central"
        stroke="none"
        className="fill-accent-700 font-bold"
      >
        {formatLongueur(t.largeur)}
      </text>
    </g>
  );
}
