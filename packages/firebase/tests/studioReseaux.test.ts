import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import {
  configReseaux,
  connecterReseauStudio,
  deconnecterReseauStudio,
  jetonReseauStudio,
  listerComptesStudio,
  type ConfigReseaux,
} from '../src/serveur/studio';

/** Connexions des réseaux du Studio (STUDIO.md §10) : faux serveurs OAuth, jetons chiffrés. */
let db: Firestore;
let maintenant = Date.UTC(2026, 10, 6, 9);
const requetes: { url: string; corps: string }[] = [];
type Route = (url: string, corps: string) => unknown;
let routes: [RegExp, Route][] = [];

const faux: typeof fetch = async (entree, init) => {
  const url = String(entree);
  const corps = typeof init?.body === 'string' ? init.body : '';
  requetes.push({ url, corps });
  const r = routes.find(([m]) => m.test(url));
  if (!r) return new Response('{}', { status: 404 });
  const v = r[1](url, corps);
  return v instanceof Response ? v : Response.json(v);
};

const config = (): ConfigReseaux => {
  const c = configReseaux(
    {
      STUDIO_CHIFFREMENT_CLE: Buffer.alloc(32, 7).toString('base64'),
      NEXT_PUBLIC_SITE_URL: 'https://portail.test',
      GOOGLE_OAUTH_CLIENT_ID: 'gid',
      GOOGLE_OAUTH_CLIENT_SECRET: 'gsecret',
      INSTAGRAM_APP_ID: 'iid',
      INSTAGRAM_APP_SECRET: 'isecret',
      TIKTOK_CLIENT_KEY: 'tk',
      TIKTOK_CLIENT_SECRET: 'tsecret',
    },
    faux,
  )!;
  return { ...c, horloge: () => maintenant };
};

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  requetes.length = 0;
  maintenant = Date.UTC(2026, 10, 6, 9);
  routes = [
    [
      /oauth2\.googleapis\.com\/token/,
      (_, c) =>
        c.includes('grant_type=refresh_token')
          ? { access_token: 'g-acces-2', expires_in: 3600 }
          : { access_token: 'g-acces', refresh_token: 'g-rafraichir', expires_in: 3600 },
    ],
    [
      /youtube\/v3\/channels/,
      () => ({ items: [{ id: 'UC1', snippet: { title: 'Portail Travaux' } }] }),
    ],
    [/api\.instagram\.com\/oauth/, () => ({ access_token: 'i-court', user_id: 42 })],
    [
      /graph\.instagram\.com\/access_token/,
      () => ({ access_token: 'i-long', expires_in: 5_184_000 }),
    ],
    [/graph\.instagram\.com\/me/, () => ({ user_id: '1789', username: 'portailtravaux' })],
    [
      /open\.tiktokapis\.com\/v2\/oauth/,
      () => ({ access_token: 't-acces', refresh_token: 't-r', expires_in: 86_400, open_id: 'o1' }),
    ],
    [
      /open\.tiktokapis\.com\/v2\/user/,
      () => ({ data: { user: { open_id: 'o1', display_name: 'Portail' } } }),
    ],
  ];
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
});

describe('connexion des réseaux', () => {
  it('sans clé de chiffrement de 32 octets : pas de connexion possible', () => {
    expect(configReseaux({})).toBeNull();
    expect(configReseaux({ STUDIO_CHIFFREMENT_CLE: 'court' })).toBeNull();
  });

  it('YouTube : jetons chiffrés en base, nom de la chaîne, jamais le jeton en clair', async () => {
    const c = config();
    const compte = await connecterReseauStudio(db, c, {
      reseau: 'youtube',
      code: 'abc',
      auteurUid: 'sa',
    });
    expect(compte).toMatchObject({ reseau: 'youtube', compteId: 'UC1', nom: 'Portail Travaux' });
    expect(requetes[0]!.corps).toContain(
      'redirect_uri=https%3A%2F%2Fportail.test%2Fapi%2Fstudio%2Freseaux%2Fyoutube%2Fretour',
    );
    const brut = JSON.stringify((await db.doc('studioComptes/youtube').get()).data());
    expect(brut).not.toContain('g-acces');
    expect(brut).not.toContain('g-rafraichir');
    expect(await jetonReseauStudio(db, c, 'youtube')).toEqual({
      jeton: 'g-acces',
      compteId: 'UC1',
    });
    expect(await listerComptesStudio(db)).toEqual([
      { reseau: 'youtube', compteId: 'UC1', nom: 'Portail Travaux', connecteLe: maintenant },
    ]);
  });

  it('jeton expiré : renouvelé avec le jeton de rafraîchissement', async () => {
    const c = config();
    await connecterReseauStudio(db, c, { reseau: 'youtube', code: 'abc', auteurUid: 'sa' });
    maintenant += 2 * 3_600_000;
    expect((await jetonReseauStudio(db, c, 'youtube'))?.jeton).toBe('g-acces-2');
    expect(requetes.at(-1)!.corps).toContain('refresh_token=g-rafraichir');
  });

  it('renouvellement refusé : message pour reconnecter', async () => {
    const c = config();
    await connecterReseauStudio(db, c, { reseau: 'tiktok', code: 'x', auteurUid: 'sa' });
    routes.unshift([/open\.tiktokapis\.com\/v2\/oauth/, () => new Response('{}', { status: 400 })]);
    maintenant += 2 * 86_400_000;
    await expect(jetonReseauStudio(db, c, 'tiktok')).rejects.toThrow(/reconnectez/);
  });

  it('Instagram : jeton long de 60 jours, renouvelé une semaine avant la fin', async () => {
    const c = config();
    const compte = await connecterReseauStudio(db, c, {
      reseau: 'instagram',
      code: 'x',
      auteurUid: 'sa',
    });
    expect(compte).toMatchObject({ compteId: '1789', nom: '@portailtravaux' });
    expect((await jetonReseauStudio(db, c, 'instagram'))?.jeton).toBe('i-long');
    routes.unshift([
      /refresh_access_token/,
      () => ({ access_token: 'i-long-2', expires_in: 5_184_000 }),
    ]);
    maintenant += 55 * 86_400_000;
    expect((await jetonReseauStudio(db, c, 'instagram'))?.jeton).toBe('i-long-2');
  });

  it('TikTok, puis déconnexion', async () => {
    const c = config();
    expect(
      await connecterReseauStudio(db, c, { reseau: 'tiktok', code: 'x', auteurUid: 'sa' }),
    ).toMatchObject({ compteId: 'o1', nom: 'Portail' });
    expect(requetes[0]!.corps).toContain('client_key=tk');
    await deconnecterReseauStudio(db, 'tiktok');
    expect(await jetonReseauStudio(db, c, 'tiktok')).toBeNull();
  });

  it('YouTube sans chaîne : refus lisible', async () => {
    routes.unshift([/youtube\/v3\/channels/, () => ({ items: [] })]);
    await expect(
      connecterReseauStudio(db, config(), { reseau: 'youtube', code: 'x', auteurUid: 'sa' }),
    ).rejects.toThrow(/chaîne/);
  });
});
