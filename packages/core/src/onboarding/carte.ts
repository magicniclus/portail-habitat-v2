/**
 * Carte de l'étape 2 de l'inscription (maquette Onboarding Etape 2) : tuiles OpenStreetMap en
 * projection Web Mercator, sans bibliothèque de cartographie (budget JavaScript D46).
 */
const TUILE = 256;
const SERVEUR_TUILES = 'https://tile.openstreetmap.org';

export interface Point {
  latitude: number;
  longitude: number;
}

/** France entière sans ville ; ensuite assez proche pour que le cercle du rayon tienne. */
export function zoomCarte(rayonKm: number | null): number {
  if (rayonKm === null) return 5;
  return rayonKm >= 100 ? 7 : rayonKm >= 50 ? 8 : 9;
}

function pixelMonde(p: Point, zoom: number) {
  const n = 2 ** zoom;
  const la = (p.latitude * Math.PI) / 180;
  return {
    x: ((p.longitude + 180) / 360) * n * TUILE,
    y: ((1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2) * n * TUILE,
  };
}

/** Tuiles qui couvrent une vue de `largeur` × `hauteur` px centrée sur `centre` (positions en px). */
export function tuilesCarte(
  centre: Point,
  zoom: number,
  largeur: number,
  hauteur: number,
): { url: string; x: number; y: number }[] {
  const n = 2 ** zoom;
  const c = pixelMonde(centre, zoom);
  const x0 = c.x - largeur / 2;
  const y0 = c.y - hauteur / 2;
  const tuiles: { url: string; x: number; y: number }[] = [];
  for (let tx = Math.floor(x0 / TUILE); tx <= Math.floor((x0 + largeur) / TUILE); tx++)
    for (let ty = Math.floor(y0 / TUILE); ty <= Math.floor((y0 + hauteur) / TUILE); ty++) {
      if (ty < 0 || ty >= n) continue;
      const wx = ((tx % n) + n) % n;
      tuiles.push({
        url: `${SERVEUR_TUILES}/${zoom}/${wx}/${ty}.png`,
        x: Math.round(tx * TUILE - x0),
        y: Math.round(ty * TUILE - y0),
      });
    }
  return tuiles;
}

/** Diamètre à l'écran (px) d'un cercle de `rayonKm` autour d'un point de latitude `latitude`. */
export function diametreRayonPx(latitude: number, zoom: number, rayonKm: number): number {
  const metresParPx = (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;
  return Math.round((rayonKm * 2000) / metresParPx);
}

/** Libellé d'activité sous l'estimation (maquette). */
export function intensiteZone(demandes: number): string {
  return demandes >= 18
    ? 'Zone très active en ce moment'
    : demandes >= 10
      ? 'Zone active en ce moment'
      : 'Zone calme, peu de concurrence';
}
