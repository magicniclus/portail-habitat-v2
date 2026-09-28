import type { artisanPublic } from '../schemas/artisans';
import type { z } from '../zod';

type ArtisanPublic = z.input<typeof artisanPublic>;

/** Collection Typesense de l'annuaire (README « Annuaire », D4) : champs de `artisansPublic` seulement. */
export const COLLECTION_ARTISANS = 'artisans';

export function schemaCollectionArtisans() {
  return {
    name: COLLECTION_ARTISANS,
    fields: [
      { name: 'nomCommercial', type: 'string', locale: 'fr' },
      { name: 'metiers', type: 'string[]', facet: true },
      { name: 'tags', type: 'string[]', locale: 'fr' },
      { name: 'pitch', type: 'string', locale: 'fr' },
      { name: 'lieu', type: 'geopoint' },
      { name: 'scoreClassement', type: 'float' },
    ],
    default_sorting_field: 'scoreClassement',
  };
}

/** Document indexé : l'identifiant et les champs cherchables ; le reste est relu dans Firestore. */
export function documentArtisanTypesense(id: string, a: ArtisanPublic) {
  return {
    id,
    nomCommercial: a.nomCommercial,
    metiers: a.metiers,
    tags: a.tags,
    pitch: a.pitch,
    lieu: [a.geo.latitude, a.geo.longitude],
    scoreClassement: a.scoreClassement,
  };
}

/** Paramètres de recherche : texte, dans le rayon (km), au plus 250 identifiants par pertinence. */
export function parametresRechercheArtisans(
  q: string,
  lieu: { latitude: number; longitude: number },
  rayonKm: number,
): Record<string, string> {
  return {
    q,
    query_by: 'tags,nomCommercial,metiers,pitch',
    filter_by: `lieu:(${lieu.latitude}, ${lieu.longitude}, ${rayonKm} km)`,
    include_fields: 'id',
    per_page: '250',
    prioritize_exact_match: 'true',
    num_typos: '1',
  };
}
