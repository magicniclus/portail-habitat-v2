const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/** Encodage geohash standard (même résultat que geofire-common), précision 10 par défaut (~1 m). */
export function encoderGeohash(latitude: number, longitude: number, precision = 10): string {
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
    throw new RangeError('Coordonnées hors limites.');
  const lat = [-90, 90];
  const lon = [-180, 180];
  let hash = '';
  let bits = 0;
  let valeur = 0;
  let pair = true;
  while (hash.length < precision) {
    const [plage, v] = pair ? [lon, longitude] : [lat, latitude];
    const milieu = (plage[0]! + plage[1]!) / 2;
    valeur <<= 1;
    if (v >= milieu) {
      valeur |= 1;
      plage[0] = milieu;
    } else plage[1] = milieu;
    pair = !pair;
    if (++bits === 5) {
      hash += BASE32[valeur];
      bits = 0;
      valeur = 0;
    }
  }
  return hash;
}
