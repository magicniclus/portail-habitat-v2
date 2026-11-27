import { COULEURS_PLAN } from '@ph/ui/tokens';

/**
 * Étiquette de mesure du plan : texte centré sur son point, dans une pastille arrondie avec une
 * marge de chaque côté (largeur estimée d'après le nombre de caractères).
 */
export function EtiquetteSvg({
  x,
  y,
  texte,
  taille,
  trait = COULEURS_PLAN.etiquetteTrait,
  couleur,
}: {
  x: number;
  y: number;
  texte: string;
  /** Hauteur des caractères (mm du plan). */
  taille: number;
  trait?: string;
  /** Couleur du texte (sinon celle du texte courant). */
  couleur?: string;
}) {
  const l = (texte.length * 0.56 + 1.1) * taille;
  return (
    <>
      <rect
        x={x - l / 2}
        y={y - taille * 0.8}
        width={l}
        height={taille * 1.6}
        rx={taille * 0.8}
        fill={COULEURS_PLAN.etiquette}
        stroke={trait}
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={x}
        y={y}
        fontSize={taille}
        textAnchor="middle"
        dominantBaseline="central"
        fill={couleur}
        className={`font-semibold select-none ${couleur ? '' : 'fill-texte'}`}
      >
        {texte}
      </text>
    </>
  );
}
