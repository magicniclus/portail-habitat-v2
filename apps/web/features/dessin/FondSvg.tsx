import { tailleFond, type FondImage } from '@ph/core/dessin';
import type { FondCharge } from './useFond';

/** Plan importé (D91), sous tout le dessin, à son échelle et son opacité. */
export function FondSvg({ fond, image }: { fond: FondImage; image: FondCharge }) {
  const { l, h } = tailleFond(fond, image.largeurPx, image.hauteurPx);
  return (
    <image
      href={image.url}
      x={fond.position.x}
      y={fond.position.y}
      width={l}
      height={h}
      opacity={fond.opacite / 100}
      preserveAspectRatio="none"
      pointerEvents="none"
    />
  );
}
