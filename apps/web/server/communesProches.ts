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
