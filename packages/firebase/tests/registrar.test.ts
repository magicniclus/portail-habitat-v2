import { describe, expect, it, vi } from 'vitest';
import {
  disponibiliteDns,
  registrarDepuisEnv,
  registrarGandi,
  registrarOvh,
  signatureOvh,
} from '../src/serveur/sites/registrar';

const reponse = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { 'content-type': 'application/json' } });
const cles = { cleApplication: 'ak', secretApplication: 'as', cleConsommateur: 'ck' };
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

describe('bureau d’enregistrement OVH (DOMAINES §3)', () => {
  it('signature $1$ + SHA1 des éléments joints par « + »', () => {
    // sha1("as+ck+GET+https://eu.api.ovh.com/1.0/me++1700000000")
    expect(signatureOvh(cles, 'GET', 'https://eu.api.ovh.com/1.0/me', '', 1_700_000_000)).toMatch(
      /^\$1\$[0-9a-f]{40}$/,
    );
    expect(signatureOvh(cles, 'GET', 'u', '', 1)).not.toBe(signatureOvh(cles, 'GET', 'u', '', 2));
  });

  it('disponibilité : libre seulement si une offre « create » est commandable', async () => {
    const f = vi.fn(async (url: URL | string, init?: RequestInit) => {
      const u = String(url);
      expect(init?.headers).toMatchObject({ 'X-Ovh-Application': 'ak', 'X-Ovh-Consumer': 'ck' });
      if (u.endsWith('/order/cart')) return reponse({ cartId: 'c1' });
      if (u.includes('libre.fr')) return reponse([{ action: 'create', orderable: true }]);
      if (u.includes('panne.fr')) return reponse({}, 500);
      return reponse([{ action: 'transfer', orderable: true }]);
    });
    const r = await registrarOvh(cles, f as never).disponibilite([
      'libre.fr',
      'pris.fr',
      'panne.fr',
    ]);
    expect(r).toEqual([
      { nom: 'libre.fr', libre: true },
      { nom: 'pris.fr', libre: false },
      { nom: 'panne.fr', libre: false },
    ]);
  });

  it('commande au nom de l’entreprise : contact titulaire (SIREN), panier, paiement', async () => {
    const appels: [string, string, unknown][] = [];
    const f = vi.fn(async (url: URL | string, init?: RequestInit) => {
      const u = String(url).replace('https://eu.api.ovh.com/1.0', '');
      appels.push([init?.method ?? 'GET', u, init?.body ? JSON.parse(String(init.body)) : null]);
      if (u === '/me/contact') return reponse({ id: 42 });
      if (u === '/order/cart') return reponse({ cartId: 'c1' });
      if (u.endsWith('/domain')) return reponse({ itemId: 7 });
      if (u.endsWith('/checkout')) return reponse({ orderId: 9001 });
      return reponse(null);
    });
    const r = await registrarOvh(cles, f as never).commander('dupont.fr', titulaire);
    expect(r).toEqual({ commandeId: '9001' });
    expect(appels[0]![2]).toMatchObject({
      legalForm: 'corporation',
      organisationName: 'Dupont Rénovation SARL',
      companyNationalIdentificationNumber: '123456789',
      phone: '+33.556123456',
      address: { city: 'Bordeaux', country: 'FR' },
    });
    expect(appels.map(([m, u]) => `${m} ${u}`)).toEqual([
      'POST /me/contact',
      'POST /order/cart',
      'POST /order/cart/c1/assign',
      'POST /order/cart/c1/domain',
      'POST /order/cart/c1/item/7/configuration',
      'POST /order/cart/c1/checkout',
    ]);
    expect(appels[4]![2]).toEqual({ label: 'OWNER_CONTACT', value: '/me/contact/42' });
  });

  it('état de la commande', async () => {
    const etat = async (s: string) =>
      registrarOvh(cles, (async () => reponse(s)) as never).etatCommande('9001');
    expect(await etat('delivered')).toBe('livre');
    expect(await etat('cancelled')).toBe('echec');
    expect(await etat('delivering')).toBe('en_cours');
  });

  it('zone : anciennes cibles A/CNAME retirées, MX et TXT gardés, nouvelles lignes écrites', async () => {
    const appels: string[] = [];
    const types: Record<string, string> = { '1': 'A', '2': 'MX', '3': 'TXT', '4': 'CNAME' };
    const corps: unknown[] = [];
    const f = vi.fn(async (url: URL | string, init?: RequestInit) => {
      const u = String(url).replace('https://eu.api.ovh.com/1.0/domain/zone/dupont.fr', '');
      appels.push(`${init?.method} ${u}`);
      if (init?.method === 'POST' && u === '/record') corps.push(JSON.parse(String(init.body)));
      if (u === '/record?subDomain=') return reponse([1, 2, 3]);
      if (u === '/record?subDomain=www') return reponse([4]);
      const id = /\/record\/(\d)$/.exec(u)?.[1];
      if (id && init?.method === 'GET') return reponse({ fieldType: types[id] });
      return reponse(null);
    });
    await registrarOvh(cles, f as never).ecrireZone('dupont.fr', [
      { type: 'A', nom: '@', valeur: '76.76.21.21' },
      { type: 'CNAME', nom: 'www', valeur: 'cname.vercel-dns.com' },
    ]);
    expect(appels.filter((a) => a.startsWith('DELETE'))).toEqual([
      'DELETE /record/1',
      'DELETE /record/4',
    ]);
    expect(corps).toEqual([
      { fieldType: 'A', subDomain: '', target: '76.76.21.21', ttl: 3600 },
      { fieldType: 'CNAME', subDomain: 'www', target: 'cname.vercel-dns.com.', ttl: 3600 },
    ]);
    expect(appels.at(-1)).toBe('POST /refresh');
  });

  it('code de transfert : domaine déverrouillé puis code lu', async () => {
    const f = vi.fn(async (_u: URL | string, init?: RequestInit) =>
      reponse(init?.method === 'GET' ? 'AUTH-123' : null),
    );
    expect(await registrarOvh(cles, f as never).codeTransfert('dupont.fr')).toBe('AUTH-123');
    expect(f.mock.calls[0]![1]?.method).toBe('PUT');
  });

  it('erreur OVH → INDISPONIBLE', async () => {
    const r = registrarOvh(cles, (async () => reponse({}, 403)) as never);
    await expect(r.etatCommande('1')).rejects.toMatchObject({ code: 'INDISPONIBLE' });
  });
});

describe('bureau selon l’environnement', () => {
  it('OVH si ses trois clés sont là (prioritaire), sinon Gandi', () => {
    expect(
      registrarDepuisEnv({
        OVH_APP_KEY: 'a',
        OVH_APP_SECRET: 'b',
        OVH_CONSUMER_KEY: 'c',
        GANDI_TOKEN: 'pat',
      }).fournisseur,
    ).toBe('ovh');
  });

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
