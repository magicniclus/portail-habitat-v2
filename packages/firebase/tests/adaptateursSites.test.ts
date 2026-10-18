import { describe, expect, it, vi } from 'vitest';
import {
  hebergeurDepuisEnv,
  hebergeurVercel,
  resolveurDoh,
} from '../src/serveur/sites/adaptateurs';

const reponse = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { 'content-type': 'application/json' } });

describe('hébergeur Vercel (DOMAINES §4)', () => {
  it('valeurs A et CNAME lues dans la configuration recommandée, vérifications TXT reprises', async () => {
    const f = vi.fn(async (url: URL | string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('/config')) {
        expect(u).toContain('teamId=t1');
        return reponse({
          recommendedIPv4: [
            { rank: 2, value: ['198.51.100.9'] },
            { rank: 1, value: ['203.0.113.7'] },
          ],
          recommendedCNAME: [{ rank: 1, value: 'abc.vercel-dns-017.com.' }],
        });
      }
      expect(init?.headers).toMatchObject({ authorization: 'Bearer jeton' });
      if (init?.method === 'GET') return reponse({ verified: true });
      const nom = JSON.parse(String(init?.body)).name as string;
      return nom.startsWith('www.')
        ? reponse({}, 409)
        : reponse({
            verified: false,
            verification: [{ type: 'TXT', domain: '_vercel.exemple.fr', value: 'vc=1' }],
          });
    });
    const h = hebergeurVercel({ jeton: 'jeton', projet: 'sites', equipe: 't1' }, f as never);
    const r = await h.ajouterDomaine('exemple.fr');
    // 409 sur www : relecture de l'état du domaine déjà ajouté.
    expect(f.mock.calls.some(([, i]) => i?.method === 'GET')).toBe(true);
    expect(r).toEqual({
      apex: ['203.0.113.7'],
      cname: 'abc.vercel-dns-017.com.',
      verifications: [{ nom: '_vercel.exemple.fr', valeur: 'vc=1' }],
    });
  });

  it('servi seulement si le domaine nu et www sont vérifiés', async () => {
    const f = vi.fn(async (url: URL | string) =>
      reponse({ verified: !String(url).includes('www.') }),
    );
    expect(
      await hebergeurVercel({ jeton: 'j', projet: 'p' }, f as never).verifierDomaine('e.fr'),
    ).toBe(false);
  });
});

describe('résolveur DNS-over-HTTPS', () => {
  it('filtre le type demandé, recolle les TXT, passe au serveur suivant en cas d’erreur', async () => {
    const f = vi
      .fn()
      .mockRejectedValueOnce(new Error('panne'))
      .mockResolvedValueOnce(
        reponse({
          Answer: [
            { type: 5, data: 'x.' },
            { type: 16, data: '"ph-verif=" "abc"' },
          ],
        }),
      );
    expect(await resolveurDoh(f as never).resoudre('TXT', '_portailtravaux.e.fr')).toEqual([
      'ph-verif=abc',
    ]);
    expect(String(f.mock.calls[1]![0])).toContain('dns.google');
  });
});

describe('adaptateurs selon l’environnement', () => {
  it('sans clé Vercel : refus en production, hébergeur local ailleurs', async () => {
    await expect(
      hebergeurDepuisEnv({ VERCEL_ENV: 'production' }).ajouterDomaine('e.fr'),
    ).rejects.toThrow();
    expect((await hebergeurDepuisEnv({}).ajouterDomaine('e.fr')).apex).toEqual(['127.0.0.1']);
  });
});
