import { ErreurMetier } from '@ph/core/erreurs';
import { z } from '@ph/core/zod';

/** Géoplateforme (IGN, ex-API Adresse) : gratuite, sans clé, adresses françaises. */
const URL_GEOCODAGE = 'https://data.geopf.fr/geocodage/search';

const reponse = z.object({
  features: z.array(
    z.object({
      geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
      properties: z.object({ label: z.string() }),
    }),
  ),
});

/**
 * Adresse de l'élément Carte → position et libellé normalisé ; `null` si rien n'est trouvé.
 * Panne : `INDISPONIBLE` (l'artisan peut réessayer, la carte garde son encart).
 */
export async function geocoderAdresse(
  adresse: string,
  f: typeof fetch = fetch,
): Promise<{ latitude: number; longitude: number; libelle: string } | null> {
  const r = await f(`${URL_GEOCODAGE}?q=${encodeURIComponent(adresse)}&limit=1`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!r?.ok)
    throw new ErreurMetier('INDISPONIBLE', 'Recherche d’adresse indisponible, réessayez.');
  const corps = reponse.safeParse(await r.json().catch(() => null));
  if (!corps.success) throw new ErreurMetier('INDISPONIBLE', 'Recherche d’adresse indisponible.');
  const premier = corps.data.features[0];
  if (!premier) return null;
  const [longitude, latitude] = premier.geometry.coordinates;
  return { latitude, longitude, libelle: premier.properties.label };
}
