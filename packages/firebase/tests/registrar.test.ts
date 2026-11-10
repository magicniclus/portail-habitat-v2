import { describe, expect, it, vi } from 'vitest';
import {
  disponibiliteDns,
  registrarDepuisEnv,
  registrarGandi,
} from '../src/serveur/sites/registrar';

const reponse = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { 'content-type': 'application/json' } });
const titulaire = {
  organisation: 'Dupont Rénovation SARL',
  siren: '123456789',
  adresse: { ligne1: '3 rue des Lilas', codePostal: '33000', ville: 'Bordeaux', pays: 'FR' },
  email: 'contact@dupont.fr',
  telephone: '+33556123456',
};

describe('bureau d’enregistrement Gandi (DOMAINES §3)', () => {
  const BASE = 'https://api.gandi.net/v5';

  it('disponibilité : libre seulement si la création est « available » ; panne : pris', async () => {
    const f = vi.fn(async (url: URL | string, init?: RequestInit) => {
      const u = String(url);
      expect(init?.headers).toMatchObject({ authorization: 'Bearer pat' });
      if (u.includes('libre.fr'))
        return reponse({ products: [{ process: 'create', status: 'available' }] });
      if (u.includes('premium.fr'))
        return reponse({ products: [{ process: 'create', status: 'unavailable_premium' }] });
      if (u.includes('panne.fr')) return reponse({}, 500);
      return reponse({ products: [{ process: 'create', status: 'unavailable' }] });
    });
    const r = await registrarGandi({ jeton: 'pat' }, f as never).disponibilite([
      'libre.fr',
      'pris.fr',
      'premium.fr',
      'panne.fr',
    ]);
    expect(r).toEqual([
      { nom: 'libre.fr', libre: true },
      { nom: 'pris.fr', libre: false },
      { nom: 'premium.fr', libre: false },
      { nom: 'panne.fr', libre: false },
    ]);
    expect(String(f.mock.calls[0]![0])).toBe(`${BASE}/domain/check?name=libre.fr`);
  });

  it('commande au nom de l’entreprise : titulaire société avec SIREN, un an', async () => {
    const f = vi.fn(async () => reponse({ message: 'accepted' }, 202));
    const r = await registrarGandi({ jeton: 'pat' }, f as never).commander('dupont.fr', titulaire);
    expect(r).toEqual({ commandeId: 'dupont.fr' });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${BASE}/domain/domains`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toMatchObject({
      fqdn: 'dupont.fr',
      duration: 1,
      owner: {
        type: 'company',
        orgname: 'Dupont Rénovation SARL',
        siren: '123456789',
        phone: '+33.556123456',
        streetaddr: '3 rue des Lilas',
        zip: '33000',
        city: 'Bordeaux',
        country: 'FR',
      },
    });
  });

  it('bac à sable : rien n’est acheté pour de vrai', async () => {
    const f = vi.fn(async () => reponse({ products: [] }));
    await registrarGandi({ jeton: 'pat', bacASable: true }, f as never).disponibilite(['a.fr']);
    expect(String((f.mock.calls[0] as unknown as [string])[0])).toMatch(
      /^https:\/\/api\.sandbox\.gandi\.net\/v5\//,
    );
  });

  it('état : créé (303) → livré et renouvellement automatique ; erreur → échec', async () => {
    const appels: string[] = [];
    const f = vi.fn(async (url: URL | string, init?: RequestInit) => {
      appels.push(`${init?.method} ${String(url).replace(BASE, '')}`);
      if (String(url).endsWith('/createstatus')) return new Response(null, { status: 303 });
      return reponse({ message: 'ok' }, 201);
    });
    expect(await registrarGandi({ jeton: 'pat' }, f as never).etatCommande('dupont.fr')).toBe(
      'livre',
    );
    expect(appels).toEqual([
      'GET /domain/domains/dupont.fr/createstatus',
      'PATCH /domain/domains/dupont.fr/autorenew',
    ]);
    const etat = (step: string) =>
      registrarGandi({ jeton: 'pat' }, (async () => reponse({ step })) as never).etatCommande(
        'dupont.fr',
      );
    expect(await etat('RUN')).toBe('en_cours');
    expect(await etat('ERROR')).toBe('echec');
  });

  it('zone LiveDNS : A/AAAA/CNAME de @ et www retirés (MX jamais), nouvelles valeurs écrites', async () => {
    const appels: string[] = [];
    const corps: unknown[] = [];
    const f = vi.fn(async (url: URL | string, init?: RequestInit) => {
      const u = String(url).replace(`${BASE}/livedns/domains/dupont.fr/records`, '');
      appels.push(`${init?.method} ${u}`);
      if (init?.method === 'PUT') corps.push([u, JSON.parse(String(init.body))]);
      if (init?.method === 'DELETE')
        return new Response(null, { status: u === '/@/A' ? 204 : 404 });
      return reponse({ message: 'ok' }, 201);
    });
    await registrarGandi({ jeton: 'pat' }, f as never).ecrireZone('dupont.fr', [
      { type: 'A', nom: '@', valeur: '76.76.21.21' },
      { type: 'CNAME', nom: 'www', valeur: 'cname.vercel-dns.com' },
    ]);
    expect(appels.filter((a) => a.startsWith('DELETE'))).toEqual([
      'DELETE /@/A',
      'DELETE /@/AAAA',
      'DELETE /@/CNAME',
      'DELETE /www/A',
      'DELETE /www/AAAA',
      'DELETE /www/CNAME',
    ]);
    expect(appels.some((a) => a.includes('MX'))).toBe(false);
    expect(corps).toEqual([
      ['/@/A', { rrset_values: ['76.76.21.21'], rrset_ttl: 3600 }],
      ['/www/CNAME', { rrset_values: ['cname.vercel-dns.com.'], rrset_ttl: 3600 }],
    ]);
  });

  it('code de transfert lu sur la fiche du domaine', async () => {
    const f = vi.fn(async () => reponse({ fqdn: 'dupont.fr', authinfo: 'AUTH-123' }));
    expect(await registrarGandi({ jeton: 'pat' }, f as never).codeTransfert('dupont.fr')).toBe(
      'AUTH-123',
    );
  });

  it('erreur Gandi → INDISPONIBLE', async () => {
    const r = registrarGandi({ jeton: 'pat' }, (async () => reponse({}, 403)) as never);
    await expect(r.etatCommande('dupont.fr')).rejects.toMatchObject({ code: 'INDISPONIBLE' });
    await expect(r.commander('dupont.fr', titulaire)).rejects.toMatchObject({
      code: 'INDISPONIBLE',
    });
  });
});

describe('bureau selon l’environnement', () => {
  it('Gandi si son jeton est là', () => {
    expect(registrarDepuisEnv({ GANDI_TOKEN: 'pat' }).fournisseur).toBe('gandi');
  });

  it('production sans clés : achat indisponible', async () => {
    const r = registrarDepuisEnv({ VERCEL_ENV: 'production', NODE_ENV: 'production' });
    await expect(r.disponibilite(['a.fr'])).rejects.toMatchObject({ code: 'INDISPONIBLE' });
  });

  it('DNS public : libre seulement si le domaine n’existe pas (NXDOMAIN) ; panne : pris', async () => {
    const f = vi.fn(async (url: URL | string) => {
      const u = String(url);
      if (u.includes('panne')) throw new Error('réseau');
      return reponse({ Status: u.includes('libre') ? 3 : 0 });
    });
    expect(await disponibiliteDns(['libre.fr', 'google.fr', 'panne.fr'], f as never)).toEqual([
      { nom: 'libre.fr', libre: true },
      { nom: 'google.fr', libre: false },
      { nom: 'panne.fr', libre: false },
    ]);
  });

  it('local : commande livrée aussitôt', async () => {
    const r = registrarDepuisEnv({ NODE_ENV: 'test' });
    expect(r.fournisseur).toBe('local');
    expect(await r.etatCommande((await r.commander('libre.fr', titulaire)).commandeId)).toBe(
      'livre',
    );
  });
});
