import { runInNewContext } from 'node:vm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CACHES_PRO, sourceServiceWorker } from './serviceWorker';

type Ecouteur = (e: Record<string, unknown>) => void;
const ORIGINE = 'https://portailhabitat.test';

/** Worker exécuté dans un bac à sable : caches, réseau et notifications simulés. */
function worker(reseau: (url: string) => Promise<Response>) {
  const ecouteurs: Record<string, Ecouteur> = {};
  const stock = new Map<string, Map<string, Response>>();
  const cle = (r: Request | string) => (typeof r === 'string' ? new URL(r, ORIGINE).href : r.url);
  const caches = {
    open: async (nom: string) => {
      const c = stock.get(nom) ?? new Map<string, Response>();
      stock.set(nom, c);
      return {
        add: async (u: string) => void c.set(cle(u), await reseau(cle(u))),
        put: async (r: Request, res: Response) => void c.set(cle(r), res),
        match: async (r: Request | string) => c.get(cle(r))?.clone(),
      };
    },
    match: async (r: Request | string) => {
      for (const c of stock.values()) if (c.has(cle(r))) return c.get(cle(r))!.clone();
      return undefined;
    },
    keys: async () => [...stock.keys()],
    delete: async (nom: string) => stock.delete(nom),
  };
  const showNotification = vi.fn(async () => undefined);
  const self = {
    location: new URL(ORIGINE),
    addEventListener: (type: string, f: Ecouteur) => (ecouteurs[type] = f),
    skipWaiting: async () => undefined,
    clients: { claim: async () => undefined, matchAll: async () => [], openWindow: vi.fn() },
    registration: { showNotification },
  };
  runInNewContext(sourceServiceWorker(), {
    self,
    caches,
    fetch: (r: Request | string) => reseau(cle(r)),
    Response,
    URL,
    Promise,
  });
  const attendre = async (type: string, e: Record<string, unknown>) => {
    let p: Promise<unknown> = Promise.resolve();
    ecouteurs[type]!({ ...e, waitUntil: (x: Promise<unknown>) => (p = x) });
    await p;
  };
  const naviguer = async (chemin: string) => {
    let reponse: Promise<Response> | undefined;
    const request = new Request(new URL(chemin, ORIGINE));
    Object.defineProperty(request, 'mode', { value: 'navigate' });
    ecouteurs.fetch!({ request, respondWith: (r: Promise<Response>) => (reponse = r) });
    return reponse ? (await reponse).text() : null;
  };
  return { attendre, naviguer, stock, showNotification, ecouteurs };
}

let enLigne: boolean;
const reseau = async (url: string) => {
  if (!enLigne) throw new TypeError('Failed to fetch');
  const r = new Response(`page ${new URL(url).pathname}`, { status: 200 });
  Object.defineProperty(r, 'type', { value: 'basic' });
  return r;
};

beforeEach(() => {
  enLigne = true;
});

describe('service worker de l’espace pro (MOBILE §9)', () => {
  it('hors ligne : page déjà ouverte relue du cache, sinon page « hors ligne »', async () => {
    const w = worker(reseau);
    await w.attendre('install', {});
    expect(await w.naviguer('/pro/demandes')).toBe('page /pro/demandes');
    enLigne = false;
    expect(await w.naviguer('/pro/demandes')).toBe('page /pro/demandes');
    expect(await w.naviguer('/pro/statistiques')).toBe('page /pro/hors-ligne');
  });

  it('ne touche ni aux pages hors de /pro/ ni aux API', async () => {
    const w = worker(reseau);
    expect(await w.naviguer('/artisans')).toBeNull();
    let repondu = false;
    w.ecouteurs.fetch!({
      request: new Request(`${ORIGINE}/api/pro/demandes`),
      respondWith: () => (repondu = true),
    });
    expect(repondu).toBe(false);
  });

  it('déconnexion : « vider » efface les pages gardées', async () => {
    const w = worker(reseau);
    await w.attendre('install', {});
    await w.naviguer('/pro/demandes');
    await w.attendre('message', { data: 'vider' });
    expect(w.stock.has(CACHES_PRO.pages)).toBe(false);
  });

  it('push : notification affichée avec le lien à ouvrir', async () => {
    const w = worker(reseau);
    await w.attendre('push', {
      data: {
        json: () => ({
          data: { titre: 'Nouvelle demande', corps: 'Peinture', lien: '/pro/demandes' },
        }),
      },
    });
    expect(w.showNotification).toHaveBeenCalledWith(
      'Nouvelle demande',
      expect.objectContaining({ body: 'Peinture', data: { lien: '/pro/demandes' } }),
    );
  });
});
