/**
 * Conversion Firestore ↔ mémoire, commune au SDK web et au SDK Admin :
 * Timestamp ↔ Date, GeoPoint ↔ { latitude, longitude }.
 */

interface HorodatageFirestore {
  toDate(): Date;
}
interface PointFirestore {
  latitude: number;
  longitude: number;
  isEqual(autre: unknown): boolean;
}

const estHorodatage = (v: unknown): v is HorodatageFirestore =>
  typeof v === 'object' && v !== null && typeof (v as HorodatageFirestore).toDate === 'function';
const estPoint = (v: unknown): v is PointFirestore =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as PointFirestore).isEqual === 'function' &&
  'latitude' in v &&
  'longitude' in v;
const estObjetSimple = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && Object.getPrototypeOf(v) === Object.prototype;

/** Données lues en base → objets JS attendus par les schémas Zod de @ph/core. */
export function depuisFirestore(valeur: unknown): unknown {
  if (estHorodatage(valeur)) return valeur.toDate();
  if (estPoint(valeur)) return { latitude: valeur.latitude, longitude: valeur.longitude };
  if (Array.isArray(valeur)) return valeur.map(depuisFirestore);
  if (estObjetSimple(valeur))
    return Object.fromEntries(Object.entries(valeur).map(([k, v]) => [k, depuisFirestore(v)]));
  return valeur;
}

/**
 * Objets JS → données à écrire. Les `Date` sont converties en Timestamp par le SDK lui-même ;
 * les points `{ latitude, longitude }` deviennent des GeoPoint (fabrique fournie par le SDK utilisé).
 */
export function versFirestore(
  valeur: unknown,
  creerPoint: (lat: number, lng: number) => unknown,
): unknown {
  if (Array.isArray(valeur)) return valeur.map((v) => versFirestore(v, creerPoint));
  if (estObjetSimple(valeur)) {
    const cles = Object.keys(valeur);
    if (
      cles.length === 2 &&
      typeof valeur.latitude === 'number' &&
      typeof valeur.longitude === 'number'
    ) {
      return creerPoint(valeur.latitude, valeur.longitude);
    }
    return Object.fromEntries(
      Object.entries(valeur)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, versFirestore(v, creerPoint)]),
    );
  }
  return valeur;
}
