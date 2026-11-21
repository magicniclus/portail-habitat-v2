import 'server-only';

export interface Lieu {
  nom: string;
  codePostal: string;
  centre: { latitude: number; longitude: number };
}

/**
 * L'API Découpage administratif répond parfois en près de 2 s : 5 s laissent le temps sans
 * bloquer la saisie (sinon la recherche revenait vide).
 */
const DELAI_MS = 5000;

/**
 * Communes par nom ou code postal (API Découpage administratif, gratuite), cache 1 jour. Un délai
 * plus court quand la réponse n'est qu'un confort (ville proposée d'office).
 */
export async function chercherCommunes(q: string, delaiMs = DELAI_MS): Promise<Lieu[]> {
  const param = /^\d{5}$/.test(q) ? `codePostal=${q}` : `nom=${encodeURIComponent(q)}`;
  try {
    const rep = await fetch(
      `https://geo.api.gouv.fr/communes?${param}&fields=nom,centre,codesPostaux&boost=population&limit=6`,
      { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(delaiMs) },
    );
    if (!rep.ok) return [];
    const communes = (await rep.json()) as {
      nom: string;
      codesPostaux: string[];
      centre?: { coordinates: [number, number] };
    }[];
    return communes
      .filter((c) => c.centre)
      .map((c) => ({
        nom: c.nom,
        // Recherche par code postal : celui saisi, pas le premier de la commune.
        codePostal: /^\d{5}$/.test(q) ? q : (c.codesPostaux[0] ?? ''),
        centre: { latitude: c.centre!.coordinates[1], longitude: c.centre!.coordinates[0] },
      }));
  } catch {
    return [];
  }
}
