/** Recherche en production sur Typesense (RECHERCHE §4, DECISIONS D4) : formats purs, sans client HTTP. */

export const COLLECTION_INTENTIONS = 'intentions';
/** Jeu de mots vides Typesense, synchronisé depuis `referentiel/recherche/synonymes/global`. */
export const JEU_MOTS_VIDES = 'mots-vides';

export interface IntentionIndexee {
  libelle: string;
  metier: string;
  prestation: string;
  motsCles: string[];
  popularite: number;
  actif: boolean;
}

export function schemaCollection() {
  return {
    name: COLLECTION_INTENTIONS,
    fields: [
      { name: 'libelle', type: 'string', locale: 'fr' },
      { name: 'motsCles', type: 'string[]', locale: 'fr' },
      { name: 'metier', type: 'string', facet: true },
      { name: 'prestation', type: 'string' },
      { name: 'popularite', type: 'int32' },
      { name: 'actif', type: 'bool' },
    ],
    default_sorting_field: 'popularite',
  };
}

/** Document indexé ; `null` pour une intention masquée (`actif: false`), à supprimer de l'index. */
export function documentTypesense(
  id: string,
  i: IntentionIndexee,
): (IntentionIndexee & { id: string }) | null {
  if (!i.actif) return null;
  return {
    id,
    libelle: i.libelle,
    metier: i.metier,
    prestation: i.prestation,
    motsCles: i.motsCles,
    popularite: i.popularite,
    actif: true,
  };
}

const idSur = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[^\w-]+/g, '-')
    .toLowerCase();

/** `referentiel/recherche/synonymes/global` → synonymes Typesense (développement = `root` à sens unique). */
export function synonymesTypesense(s: {
  developpements: Readonly<Record<string, string>>;
  equivalences: readonly (readonly string[])[];
}) {
  return [
    ...Object.entries(s.developpements).map(([racine, cible]) => ({
      id: `dev-${idSur(racine)}`,
      root: racine,
      synonyms: [cible],
    })),
    ...s.equivalences.map((groupe) => ({
      id: `eq-${idSur(groupe.join('-'))}`,
      synonyms: [...groupe],
    })),
  ];
}

/** Paramètres de `GET /collections/intentions/documents/search` (RECHERCHE §4). */
export function parametresRecherche(q: string, max: number): Record<string, string> {
  return {
    q,
    query_by: 'libelle,motsCles',
    query_by_weights: '3,2',
    prefix: 'true',
    num_typos: '2',
    typo_tokens_threshold: '1',
    drop_tokens_threshold: '1',
    sort_by: '_text_match:desc,popularite:desc',
    filter_by: 'actif:=true',
    per_page: String(max),
    include_fields: 'id',
    stopwords: JEU_MOTS_VIDES,
  };
}
