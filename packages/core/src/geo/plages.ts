import { encoderGeohash } from './geohash';

/**
 * Plages de geohash couvrant un cercle (portage de `geohashQueryBounds` de geofire-common, sans
 * dépendance) : une requête Firestore `geohash >= début && geohash < fin` par plage, puis
 * filtrage exact par la distance (les plages débordent du cercle).
 */
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const BITS_PAR_CAR = 5;
const BITS_MAX = 22 * BITS_PAR_CAR;
const CIRCONFERENCE_MERIDIEN = 40_007_860;
const METRES_PAR_DEGRE_LAT = 110_574;
const RAYON_EQUATEUR = 6_378_137;
const E2 = 0.00669447819799;
const EPSILON = 1e-12;

type Point = { latitude: number; longitude: number };

function degresLongitude(metres: number, latitude: number): number {
  const rad = (latitude * Math.PI) / 180;
  const num = (Math.cos(rad) * RAYON_EQUATEUR * Math.PI) / 180;
  const delta = num / Math.sqrt(1 - E2 * Math.sin(rad) * Math.sin(rad));
  if (delta < EPSILON) return metres > 0 ? 360 : 0;
  return Math.min(360, metres / delta);
}

const bitsLatitude = (metres: number) =>
  Math.min(Math.log2(CIRCONFERENCE_MERIDIEN / 2 / metres), BITS_MAX);

function bitsLongitude(metres: number, latitude: number): number {
  const d = degresLongitude(metres, latitude);
  return Math.abs(d) > 0.000001 ? Math.max(1, Math.log2(360 / d)) : 1;
}

function envelopperLongitude(lon: number): number {
  if (lon <= 180 && lon >= -180) return lon;
  const a = lon + 180;
  return a > 0 ? (a % 360) - 180 : 180 - (-a % 360);
}

function bitsBoite(c: Point, metres: number): number {
  const dLat = metres / METRES_PAR_DEGRE_LAT;
  const nord = Math.min(90, c.latitude + dLat);
  const sud = Math.max(-90, c.latitude - dLat);
  return Math.min(
    Math.floor(bitsLatitude(metres)) * 2,
    Math.floor(bitsLongitude(metres, nord)) * 2 - 1,
    Math.floor(bitsLongitude(metres, sud)) * 2 - 1,
    BITS_MAX,
  );
}

function pointsBoite(c: Point, metres: number): [number, number][] {
  const dLat = metres / METRES_PAR_DEGRE_LAT;
  const nord = Math.min(90, c.latitude + dLat);
  const sud = Math.max(-90, c.latitude - dLat);
  const dLon = Math.max(degresLongitude(metres, nord), degresLongitude(metres, sud));
  const ouest = envelopperLongitude(c.longitude - dLon);
  const est = envelopperLongitude(c.longitude + dLon);
  return [c.latitude, nord, sud].flatMap((lat) => [
    [lat, c.longitude],
    [lat, ouest],
    [lat, est],
  ]) as [number, number][];
}

function plage(hash: string, bits: number): [string, string] {
  const precision = Math.ceil(bits / BITS_PAR_CAR);
  if (hash.length < precision) return [hash, `${hash}~`];
  const h = hash.slice(0, precision);
  const base = h.slice(0, -1);
  const derniere = BASE32.indexOf(h.slice(-1));
  const inutiles = BITS_PAR_CAR - (bits - base.length * BITS_PAR_CAR);
  const debut = (derniere >> inutiles) << inutiles;
  const fin = debut + (1 << inutiles);
  return fin > 31 ? [base + BASE32[debut], `${base}~`] : [base + BASE32[debut], base + BASE32[fin]];
}

/** Plages `[début, fin)` de geohash qui couvrent le cercle de `rayonKm` autour de `centre`. */
export function plagesGeohash(centre: Point, rayonKm: number): [string, string][] {
  const metres = rayonKm * 1000;
  const bits = Math.max(1, bitsBoite(centre, metres));
  const precision = Math.ceil(bits / BITS_PAR_CAR);
  const vues = new Set<string>();
  const plages: [string, string][] = [];
  for (const [lat, lon] of pointsBoite(centre, metres)) {
    const p = plage(encoderGeohash(lat, lon, precision), bits);
    const cle = p.join('|');
    if (!vues.has(cle)) {
      vues.add(cle);
      plages.push(p);
    }
  }
  return plages;
}
