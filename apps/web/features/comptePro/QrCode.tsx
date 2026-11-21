import { encode } from 'uqr';

/** QR code en SVG (couleur du texte sur fond blanc, marge de 2 modules) ; `libelle` pour les lecteurs d'écran. */
export function QrCode({ valeur, libelle }: { valeur: string; libelle: string }) {
  const { size, data } = encode(valeur, { border: 2 });
  const d = data
    .flatMap((ligne, y) => ligne.map((noir, x) => (noir ? `M${x} ${y}h1v1h-1z` : '')))
    .join('');
  return (
    <svg
      role="img"
      aria-label={libelle}
      viewBox={`0 0 ${size} ${size}`}
      className="size-48 rounded-md bg-blanc text-texte"
      shapeRendering="crispEdges"
    >
      <path d={d} fill="currentColor" />
    </svg>
  );
}
