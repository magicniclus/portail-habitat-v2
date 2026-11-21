import { ligneDeFace, type Niveau } from '@ph/core/dessin';

type Murs = Pick<Niveau, 'murs'>;
import { COULEURS_PLAN } from '@ph/ui/tokens';

/**
 * Face de mur choisie, sur le plan (DES-25) : un trait épais le long de cette face seulement
 * (ou du pan visé), pour voir de quel côté le matériau sera posé.
 */
export function FaceChoisieSvg({
  niveau,
  murId,
  face,
  s,
}: {
  niveau: Murs;
  murId: string;
  face: 'a' | 'b';
  s?: number | undefined;
}) {
  const ligne = ligneDeFace(niveau, murId, face, s);
  if (!ligne) return null;
  const [p, q] = ligne;
  return (
    <line
      x1={p.x}
      y1={p.y}
      x2={q.x}
      y2={q.y}
      stroke={COULEURS_PLAN.murSelection}
      strokeWidth={5}
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
      data-testid="face-choisie"
    />
  );
}
