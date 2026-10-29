import { describe, expect, it, vi } from 'vitest';
import {
  disponibiliteDns,
  registrarDepuisEnv,
  registrarOvh,
  signatureOvh,
} from '../src/serveur/sites/registrarOvh';

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
  it('OVH si les trois clés sont là', () => {
    expect(
      registrarDepuisEnv({ OVH_APP_KEY: 'a', OVH_APP_SECRET: 'b', OVH_CONSUMER_KEY: 'c' })
        .fournisseur,
    ).toBe('ovh');
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
