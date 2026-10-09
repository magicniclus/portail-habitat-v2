import { describe, expect, it } from 'vitest';
import {
  COLLECTION_INTENTIONS,
  documentTypesense,
  parametresRecherche,
  schemaCollection,
  synonymesTypesense,
} from './typesense';

describe('Typesense (RECHERCHE §4)', () => {
  it('collection : libellé, mots-clés, métier, popularité', () => {
    expect(schemaCollection().name).toBe(COLLECTION_INTENTIONS);
    expect(schemaCollection().fields.map((f) => f.name)).toEqual([
      'libelle',
      'motsCles',
      'metier',
      'prestation',
      'popularite',
      'actif',
    ]);
    expect(schemaCollection().default_sorting_field).toBe('popularite');
  });
  it('document : intention active uniquement, identifiant repris', () => {
    const i = {
      libelle: 'Douche à l’italienne',
      metier: 'sdb',
      prestation: 'sdb-douche',
      motsCles: ['walk-in'],
      popularite: 5,
      actif: true,
    };
    expect(documentTypesense('sdb-italienne', i)).toEqual({ id: 'sdb-italienne', ...i });
    expect(documentTypesense('x', { ...i, actif: false })).toBeNull();
  });
  it('synonymes : développements à sens unique, équivalences dans les deux sens', () => {
    expect(
      synonymesTypesense({
        developpements: { sdb: 'salle de bain' },
        equivalences: [['wc', 'toilettes']],
      }),
    ).toEqual([
      { id: 'dev-sdb', root: 'sdb', synonyms: ['salle de bain'] },
      { id: 'eq-wc-toilettes', synonyms: ['wc', 'toilettes'] },
    ]);
  });
  it('paramètres de requête conformes au document', () => {
    expect(parametresRecherche('douche ita', 7)).toEqual({
      q: 'douche ita',
      query_by: 'libelle,motsCles',
      query_by_weights: '3,2',
      prefix: 'true',
      num_typos: '2',
      typo_tokens_threshold: '1',
      drop_tokens_threshold: '1',
      sort_by: '_text_match:desc,popularite:desc',
      filter_by: 'actif:=true',
      per_page: '7',
      include_fields: 'id',
      stopwords: 'mots-vides',
    });
  });
});
