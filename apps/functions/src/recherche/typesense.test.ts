import { describe, expect, it, vi } from 'vitest';
import { clientTypesense } from './typesense';

const env = {
  TYPESENSE_HOTE: 'https://ts.exemple/',
  TYPESENSE_CLE_ADMIN: 'cle-admin',
} as NodeJS.ProcessEnv;
const reponse = (status = 200) => new Response('{}', { status });

describe('synchronisation Typesense (RECHERCHE §4)', () => {
  it('sans configuration : aucun appel', () => {
    expect(clientTypesense({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it('collection créée si absente ; intention indexée puis retirée si masquée', async () => {
    const appel = vi.fn(async (url: string, init?: RequestInit) =>
      url.endsWith('/collections/intentions') && init?.method === 'GET' ? reponse(404) : reponse(),
    );
    const c = clientTypesense(env, appel as unknown as typeof fetch)!;
    await c.assurerCollection();
    expect(appel.mock.calls[1]![0]).toBe('https://ts.exemple/collections');
    const i = {
      libelle: 'Douche',
      metier: 'sdb',
      prestation: 'sdb-douche',
      motsCles: [],
      popularite: 5,
      actif: true,
    };
    await c.intention('sdb-italienne', i);
    expect(appel.mock.calls[2]![0]).toBe(
      'https://ts.exemple/collections/intentions/documents?action=upsert',
    );
    expect(JSON.parse(String(appel.mock.calls[2]![1]!.body))).toMatchObject({
      id: 'sdb-italienne',
    });
    await c.intention('sdb-italienne', { ...i, actif: false });
    expect(appel.mock.calls[3]![1]!.method).toBe('DELETE');
    expect(
      (appel.mock.calls[3]![1]!.headers as Record<string, string>)['X-TYPESENSE-API-KEY'],
    ).toBe('cle-admin');
  });

  it('synonymes puis mots vides', async () => {
    const appel = vi.fn(async () => reponse());
    const c = clientTypesense(env, appel as unknown as typeof fetch)!;
    await c.synonymes({
      developpements: { sdb: 'salle de bain' },
      equivalences: [],
      motsVides: ['de', 'la'],
    });
    expect(appel.mock.calls.map((a) => (a as unknown as [string])[0])).toEqual([
      'https://ts.exemple/collections/intentions/synonyms/dev-sdb',
      'https://ts.exemple/stopwords/mots-vides',
    ]);
  });

  it('erreur Typesense remontée (nouvelle tentative de la Function)', async () => {
    const c = clientTypesense(env, (async () => reponse(500)) as unknown as typeof fetch)!;
    await expect(c.assurerCollection()).rejects.toThrow('Typesense GET');
  });
});
