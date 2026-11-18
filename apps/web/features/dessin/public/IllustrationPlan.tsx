/**
 * Illustration du héros : un petit plan de maison dessiné en SVG (couleurs du thème par les
 * classes, aucune image à charger).
 */
export function IllustrationPlan() {
  const mur = 'fill-none stroke-texte';
  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label="Exemple de plan de maison"
      className="h-auto w-full"
    >
      <rect x="0" y="0" width="400" height="300" rx="18" className="fill-neutre-100" />
      <g className="fill-accent-100">
        <rect x="40" y="40" width="190" height="130" />
        <rect x="230" y="40" width="130" height="90" />
        <rect x="230" y="130" width="130" height="130" />
        <rect x="40" y="170" width="190" height="90" />
      </g>
      <g strokeWidth="8" strokeLinejoin="round" className={mur}>
        <path d="M40 40 H360 V260 H40 Z" />
      </g>
      <g strokeWidth="4" className={mur}>
        <path d="M230 40 V95 M230 120 V260 M40 170 H150 M180 170 H230 M230 130 H300 M330 130 H360" />
      </g>
      <g strokeWidth="2" strokeDasharray="4 3" className={mur}>
        <path d="M150 170 A30 30 0 0 1 180 140" />
        <path d="M300 130 A30 30 0 0 0 330 100" />
      </g>
      <g className="fill-neutre-800 text-[13px] font-semibold">
        <text x="135" y="110" textAnchor="middle">
          Séjour · 32 m²
        </text>
        <text x="295" y="90" textAnchor="middle">
          Cuisine
        </text>
        <text x="295" y="200" textAnchor="middle">
          Chambre
        </text>
        <text x="135" y="220" textAnchor="middle">
          Chambre
        </text>
      </g>
      <g className="fill-accent-700 text-[12px] font-bold">
        <text x="200" y="28" textAnchor="middle">
          10,60 m
        </text>
        <text x="380" y="154" textAnchor="middle" transform="rotate(90 380 154)">
          8,60 m
        </text>
      </g>
    </svg>
  );
}
