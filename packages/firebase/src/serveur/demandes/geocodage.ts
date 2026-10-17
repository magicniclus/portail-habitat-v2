import { ErreurMetier } from '@ph/core/erreurs';
import { z } from '@ph/core/zod';

export interface Lieu {
  ville: string;
  geo: { latitude: number; longitude: number };
}

/** Code postal → commune principale et centre (MATCHING §2) ; `null` si le code n'existe pas. */
export type Geocodeur = (codePostal: string) => Promise<Lieu | null>;

const URL_GEO = 'https://geo.api.gouv.fr/communes';

const reponseGeo = z.array(
  z.object({
    nom: z.string(),
    population: z.number().optional(),
    centre: z.object({ coordinates: z.tuple([z.number(), z.number()]) }).optional(),
  }),
);

/**
 * API Découpage administratif (gratuite, sans clé) : la commune la plus peuplée du code postal.
 * Panne ou réponse illisible : `INDISPONIBLE` (le brouillon reste, l'envoi peut être rejoué).
 */
export function geocodeurApiGeo(f: typeof fetch = fetch): Geocodeur {
  return async (codePostal) => {
    const url = `${URL_GEO}?codePostal=${codePostal}&fields=nom,centre,population&format=json`;
    const reponse = await f(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    }).catch(() => null);
    if (!reponse?.ok) throw new ErreurMetier('INDISPONIBLE');
    const corps = reponseGeo.safeParse(await reponse.json().catch(() => null));
    if (!corps.success) throw new ErreurMetier('INDISPONIBLE');
    const commune = corps.data
      .filter((c) => c.centre)
      .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))[0];
    if (!commune?.centre) return null;
    const [longitude, latitude] = commune.centre.coordinates;
    return { ville: commune.nom, geo: { latitude, longitude } };
  };
}
