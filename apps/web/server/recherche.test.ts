import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/recherche/route';
import { rechercherProjets } from './recherche';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('recherche côté serveur (RECHERCHE §4)', () => {
  it('sans Typesense : moteur local', async () => {
    const r = await rechercherProjets('sdb ita', 7);
    expect(r.source).toBe('local');
    expect(r.resultats[0]?.id).toBe('sdb-italienne');
  });

  it('Typesense configuré : son ordre, les détails du moteur local', async () => {
    vi.stubEnv('TYPESENSE_HOTE', 'https://ts.exemple');
    vi.stubEnv('TYPESENSE_CLE_RECHERCHE', 'cle');
    const appel = vi.fn(async () =>
      Response.json({
        hits: [{ document: { id: 'sdb-renovation' } }, { document: { id: 'sdb-italienne' } }],
      }),
    );
    vi.stubGlobal('fetch', appel);
    const r = await rechercherProjets('douche', 7);
    expect(r.source).toBe('typesense');
    expect(r.resultats.slice(0, 2).map((x) => x.id)).toEqual(['sdb-renovation', 'sdb-italienne']);
    expect(String((appel.mock.calls[0] as unknown[])[0])).toContain('query_by=libelle%2CmotsCles');
  });

  it('Typesense en panne : repli local', async () => {
    vi.stubEnv('TYPESENSE_HOTE', 'https://ts.exemple');
    vi.stubEnv('TYPESENSE_CLE_RECHERCHE', 'cle');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 })),
    );
    expect((await rechercherProjets('sdb', 7)).source).toBe('local');
  });

  it('GET : cache 1 h, projets populaires si la requête est trop courte, 429 au-delà de 30 / min', async () => {
    const req = (q: string, ip = '203.0.113.1') =>
      new Request(`http://localhost/api/recherche?q=${encodeURIComponent(q)}`, {
        headers: { 'x-forwarded-for': ip },
      });
    const r = await GET(req('pac'));
    expect(r.headers.get('cache-control')).toContain('s-maxage=3600');
    expect((await r.json()).data.resultats[0].id).toBe('pac-air-eau');
    expect((await (await GET(req('a'))).json()).data.populaires.length).toBeGreaterThan(0);
    let dernier = 200;
    for (let i = 0; i < 31; i++) dernier = (await GET(req('pac', '203.0.113.9'))).status;
    expect(dernier).toBe(429);
  });
});
