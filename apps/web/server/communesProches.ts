import 'server-only';
import { distanceKm } from '@ph/core/matching';

interface Commune {
  nom: string;
  population?: number;
  centre?: { coordinates: [number, number] };
}

const API = 'https://geo.api.gouv.fr';
/** Au-delà, les liens « près de » perdent leur sens pour un particulier. */
const RAYON_MAX_KM = 30;

/**
 * Communes de la zone d'intervention d'un artisan, les plus peuplées d'abord (API Découpage
 * administratif, gratuite, réponses mises en cache 1 jour) : liens du bas de fiche. Rien en cas
 * d'erreur ou de lenteur, la fiche s'affiche quand même.
 */
export async function communesProches(
  centre: { latitude: number; longitude: number },
  rayonKm: number,
  max = 12,
): Promise<string[]> {
  try {
    const options = { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(2000) };
    const ici = await fetch(
      `${API}/communes?lat=${centre.latitude}&lon=${centre.longitude}&fields=codeDepartement`,
      options,
    );
    if (!ici.ok) return [];
    const [c] = (await ici.json()) as { codeDepartement?: string }[];
    if (!c?.codeDepartement) return [];
    const r = await fetch(
      `${API}/departements/${c.codeDepartement}/communes?fields=nom,population,centre`,
      options,
    );
    if (!r.ok) return [];
    const rayon = Math.min(rayonKm, RAYON_MAX_KM);
    return ((await r.json()) as Commune[])
      .filter((x) => {
        const p = x.centre?.coordinates;
        return p ? distanceKm(centre, { latitude: p[1], longitude: p[0] }) <= rayon : false;
      })
      .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
      .slice(0, max)
      .map((x) => x.nom);
  } catch {
    return [];
  }
}

const options = () => ({ next: { revalidate: 86_400 }, signal: AbortSignal.timeout(2000) });

/** Commune où se trouve un point (centre de la zone d'intervention) ; `null` si inconnue. */
export async function communeDuPoint(p: {
  latitude: number;
  longitude: number;
}): Promise<string | null> {
  try {
    const r = await fetch(
      `${API}/communes?lat=${p.latitude}&lon=${p.longitude}&fields=nom`,
      options(),
    );
    if (!r.ok) return null;
    const [c] = (await r.json()) as { nom: string }[];
    return c?.nom ?? null;
  } catch {
    return null;
  }
}

/** Centre d'une commune (siège de l'entreprise) par son code postal et son nom. */
export async function centreCommune(
  nom: string,
  codePostal: string,
): Promise<{ latitude: number; longitude: number } | null> {
  if (!/^\d{5}$/.test(codePostal)) return null;
  try {
    const r = await fetch(`${API}/communes?codePostal=${codePostal}&fields=nom,centre`, options());
    if (!r.ok) return null;
    const communes = (await r.json()) as {
      nom: string;
      centre?: { coordinates: [number, number] };
    }[];
    const simple = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z]/g, '');
    const c = communes.find((x) => simple(x.nom) === simple(nom)) ?? communes[0];
    const p = c?.centre?.coordinates;
    return p ? { latitude: p[1], longitude: p[0] } : null;
  } catch {
    return null;
  }
}
