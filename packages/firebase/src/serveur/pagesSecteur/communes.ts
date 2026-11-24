import type { CommuneCandidate } from '@ph/core/pages-secteur';
import { distanceKm } from '@ph/core/matching';
import type { CommuneSecteur } from '@ph/core/schemas';
import { slugifier } from '@ph/core/format';

/**
 * Communes des pages de secteur : API Découpage administratif (geo.api.gouv.fr, gratuite, sans
 * clé). Injectable pour les tests. Une panne lève une erreur : le déclencheur sera rejoué, et
 * aucune page n'est créée avec une commune approximative.
 */
export interface SourceCommunes {
  duPoint(p: { latitude: number; longitude: number }): Promise<CommuneSecteur | null>;
  autour(p: { latitude: number; longitude: number }, rayonKm: number): Promise<CommuneCandidate[]>;
}

interface CommuneApi {
  nom: string;
  codesPostaux?: string[];
  codeDepartement?: string;
  population?: number;
  centre?: { coordinates: [number, number] };
}

const API = 'https://geo.api.gouv.fr';
const CHAMPS = 'fields=nom,codesPostaux,codeDepartement,population,centre';

function versCommune(c: CommuneApi): CommuneSecteur | null {
  const p = c.centre?.coordinates;
  if (!p) return null;
  return {
    nom: c.nom,
    slug: slugifier(c.nom),
    codePostal: c.codesPostaux?.[0] ?? '',
    departement: c.codeDepartement ?? '',
    population: c.population ?? 0,
    centre: { latitude: p[1], longitude: p[0] },
  };
}

async function lireJson<T>(url: string): Promise<T> {
  let derniere: unknown;
  for (let essai = 0; essai < 3; essai++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (r.ok) return (await r.json()) as T;
      derniere = new Error(`geo.api.gouv.fr : ${r.status}`);
    } catch (e) {
      derniere = e;
    }
  }
  throw derniere instanceof Error ? derniere : new Error('geo.api.gouv.fr indisponible');
}

export const communesApiGouv: SourceCommunes = {
  async duPoint(p) {
    const [c] = await lireJson<CommuneApi[]>(
      `${API}/communes?lat=${p.latitude}&lon=${p.longitude}&${CHAMPS}`,
    );
    return c ? versCommune(c) : null;
  },
  async autour(p, rayonKm) {
    const ici = await this.duPoint(p);
    if (!ici?.departement) return [];
    // Communes du département du point (une requête) : une zone à cheval sur deux départements
    // ne publie que le côté de l'artisan ; l'autre côté reste couvert par ses propres artisans.
    const liste = await lireJson<CommuneApi[]>(
      `${API}/departements/${ici.departement}/communes?${CHAMPS}`,
    );
    const toutes: CommuneCandidate[] = [];
    for (const c of liste) {
      const x = versCommune(c);
      if (!x) continue;
      const km = distanceKm(p, x.centre);
      if (km <= rayonKm) toutes.push({ ...x, distanceKm: Math.round(km * 10) / 10 });
    }
    return toutes;
  },
};
