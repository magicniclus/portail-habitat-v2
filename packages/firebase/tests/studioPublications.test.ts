import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import {
  annulerPublicationStudio,
  configReseaux,
  connecterReseauStudio,
  listerPublicationsStudio,
  morceauxTiktok,
  programmerPublicationStudio,
  publierDuesStudio,
  relancerPublicationStudio,
  meilleuresHeuresStudio,
  releverStatsStudio,
  resultatsPourClaudeStudio,
  type ConfigReseaux,
  type ServicesPublication,
} from '../src/serveur/studio';

/** Publication programmée (STUDIO.md §11) : faux YouTube, Instagram et TikTok. */
let db: Firestore;
let maintenant = Date.UTC(2026, 10, 6, 9);
let requetes: { methode: string; url: string; corps: unknown }[] = [];
type Route = (url: string, corps: unknown) => unknown;
let routes: [RegExp, Route][] = [];

const faux: typeof fetch = async (entree, init) => {
  const url = String(entree);
  const brut = init?.body;
  const corps =
    typeof brut === 'string'
      ? brut.startsWith('{')
        ? JSON.parse(brut)
        : brut
      : brut
        ? 'octets'
        : null;
  requetes.push({ methode: init?.method ?? 'GET', url, corps });
  const r = routes.find(([m]) => m.test(url));
  if (!r) return new Response('{}', { status: 404 });
  const v = r[1](url, corps);
  return v instanceof Response ? v : Response.json(v);
};

const config = (): ConfigReseaux => ({
  ...configReseaux(
    {
      STUDIO_CHIFFREMENT_CLE: Buffer.alloc(32, 3).toString('base64'),
      GOOGLE_OAUTH_CLIENT_ID: 'g',
      GOOGLE_OAUTH_CLIENT_SECRET: 'g',
      INSTAGRAM_APP_ID: 'i',
      INSTAGRAM_APP_SECRET: 'i',
      TIKTOK_CLIENT_KEY: 't',
      TIKTOK_CLIENT_SECRET: 't',
    },
    faux,
  )!,
  horloge: () => maintenant,
});

const services = (): ServicesPublication => ({
  db,
  horloge: () => maintenant,
  reseaux: config(),
  outils: { fetch: faux, attendre: async () => undefined },
  video: {
    lire: async () => new Uint8Array(1_000),
    urlSignee: async (c) => `https://stockage.test/${c}?signe=1`,
  },
});

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  maintenant = Date.UTC(2026, 10, 6, 9);
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  routes = [
    [
      /oauth2\.googleapis\.com/,
      () => ({ access_token: 'g', refresh_token: 'r', expires_in: 3600 }),
    ],
    [/youtube\/v3\/channels/, () => ({ items: [{ id: 'UC1', snippet: { title: 'PT' } }] })],
    [/api\.instagram\.com\/oauth/, () => ({ access_token: 'c', user_id: 9 })],
    [/graph\.instagram\.com\/access_token/, () => ({ access_token: 'il', expires_in: 5_184_000 })],
    [/graph\.instagram\.com\/me/, () => ({ user_id: '1789', username: 'pt' })],
    [/v2\/oauth\/token/, () => ({ access_token: 'tt', refresh_token: 'r', expires_in: 86_400 })],
    [/v2\/user\/info/, () => ({ data: { user: { open_id: 'o', display_name: 'PT' } } })],
  ];
  for (const reseau of ['youtube', 'instagram', 'tiktok'] as const)
    await connecterReseauStudio(db, config(), { reseau, code: 'code', auteurUid: 'sa' });
  await db.doc('studioProjets/v1').set({
    schemaVersion: 1,
    auteurUid: 'sa',
    titre: 'Vidéo',
    statut: 'pret',
    format: 'vertical',
    camera: false,
    sujets: [],
    sujet: null,
    prise: null,
    plan: null,
    version: 1,
    captures: {},
    rendu: {
      video: 'studioRendus/v1/1.mp4',
      srt: 's',
      miniature: 'm',
      dureeMs: 30_000,
      le: Timestamp.now(),
    },
    erreur: null,
    coutCentimes: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  requetes = [];
  routes.push(
    [
      /upload\/youtube\/v3\/videos/,
      () => new Response('', { status: 200, headers: { location: 'https://upload.test/yt/1' } }),
    ],
    [/upload\.test\/yt/, () => ({ id: 'abc123' })],
    [/v21\.0\/1789\/media_publish/, () => ({ id: 'ig-pub' })],
    [/v21\.0\/1789\/media/, () => ({ id: 'ig-cont' })],
    [/v21\.0\/ig-cont/, () => ({ status_code: 'FINISHED' })],
    [/v21\.0\/ig-pub/, () => ({ permalink: 'https://www.instagram.com/reel/x/' })],
    [
      /creator_info/,
      () => ({ data: { privacy_level_options: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'] } }),
    ],
    [/video\/init/, () => ({ data: { upload_url: 'https://upload.test/tt', publish_id: 'pub1' } })],
    [/upload\.test\/tt/, () => ({})],
    [
      /status\/fetch/,
      () => ({ data: { status: 'PUBLISH_COMPLETE', publicaly_available_post_id: [777] } }),
    ],
  );
});

const programmer = (quand = maintenant + 3_600_000) =>
  programmerPublicationStudio(services(), {
    projetId: 'v1',
    reseaux: ['youtube', 'instagram', 'tiktok'],
    quand,
    titre: 'Recevez des demandes gratuites',
    texte: 'Voici comment.',
    hashtags: ['artisan', 'renovation', 'devis', 'chantier'],
    auteurUid: 'sa',
  });

describe('publication programmée', () => {
  it('une publication par réseau, légende adaptée', async () => {
    const ids = await programmer();
    expect(ids).toHaveLength(3);
    const l = await listerPublicationsStudio(db, {
      depuis: maintenant,
      jusqua: maintenant + 86_400_000,
    });
    expect(l.map((p) => [p.reseau, p.statut])).toEqual([
      ['youtube', 'programmee'],
      ['instagram', 'programmee'],
      ['tiktok', 'programmee'],
    ]);
    expect(l[0]!.legende).toBe('Voici comment.\n\n#artisan #renovation #devis');
    expect(l[1]!.legende).toContain('#chantier');
  });

  it('rien avant l’heure, puis envoi sur les trois réseaux', async () => {
    await programmer();
    expect(await publierDuesStudio(services())).toEqual({ publiees: 0, echecs: 0 });
    maintenant += 3_600_000;
    expect(await publierDuesStudio(services())).toEqual({ publiees: 3, echecs: 0 });
    const l = await listerPublicationsStudio(db, { depuis: 0, jusqua: maintenant + 1 });
    expect(l.map((p) => [p.statut, p.lien])).toEqual([
      ['publiee', 'https://www.youtube.com/shorts/abc123'],
      ['publiee', 'https://www.instagram.com/reel/x/'],
      ['publiee', 'https://www.tiktok.com/video/777'],
    ]);
    // Instagram va chercher la vidéo par une adresse signée ; YouTube reçoit le titre.
    expect(requetes.find((r) => /1789\/media$/.test(r.url))?.corps).toMatchObject({
      media_type: 'REELS',
      video_url: 'https://stockage.test/studioRendus/v1/1.mp4?signe=1',
    });
    expect(requetes.find((r) => /uploadType=resumable/.test(r.url))?.corps).toMatchObject({
      snippet: { title: 'Recevez des demandes gratuites' },
    });
    // Un second passage ne republie rien.
    expect(await publierDuesStudio(services())).toEqual({ publiees: 0, echecs: 0 });
  });

  it('TikTok non validé : publiée en privé, sans lien public', async () => {
    routes.unshift(
      [/creator_info/, () => ({ data: { privacy_level_options: ['SELF_ONLY'] } })],
      [/status\/fetch/, () => ({ data: { status: 'SEND_TO_USER_INBOX' } })],
    );
    await programmerPublicationStudio(services(), {
      projetId: 'v1',
      reseaux: ['tiktok'],
      quand: maintenant,
      titre: 't',
      texte: 't',
      hashtags: [],
      auteurUid: 'sa',
    });
    await publierDuesStudio(services());
    const [p] = await listerPublicationsStudio(db, { depuis: 0, jusqua: maintenant + 1 });
    expect(p).toMatchObject({ statut: 'publiee', prive: true, lien: null });
    expect(requetes.find((r) => /video\/init/.test(r.url))?.corps).toMatchObject({
      post_info: { privacy_level: 'SELF_ONLY' },
    });
  });

  it('échec lisible, relance, annulation', async () => {
    routes.unshift([/upload\/youtube/, () => new Response('quota', { status: 403 })]);
    await programmerPublicationStudio(services(), {
      projetId: 'v1',
      reseaux: ['youtube', 'instagram'],
      quand: maintenant,
      titre: 't',
      texte: 't',
      hashtags: [],
      auteurUid: 'sa',
    });
    expect(await publierDuesStudio(services())).toEqual({ publiees: 1, echecs: 1 });
    const l = await listerPublicationsStudio(db, { depuis: 0, jusqua: maintenant + 1 });
    const yt = l.find((p) => p.reseau === 'youtube')!;
    expect(yt).toMatchObject({ statut: 'echec' });
    expect(yt.erreur).toMatch(/YouTube : envoi refusé \(403\)/);
    await relancerPublicationStudio(services(), yt.id);
    const [nouvelle] = await programmer();
    await annulerPublicationStudio(db, nouvelle!);
    await expect(
      annulerPublicationStudio(db, l.find((p) => p.reseau === 'instagram')!.id),
    ).rejects.toThrow(/Déjà envoyée/);
  });

  it('refus : vidéo pas prête, réseau non connecté, heure passée', async () => {
    await db.doc('studioComptes/tiktok').delete();
    await expect(
      programmerPublicationStudio(services(), {
        projetId: 'v1',
        reseaux: ['tiktok'],
        quand: maintenant,
        titre: 't',
        texte: 't',
        hashtags: [],
        auteurUid: 'sa',
      }),
    ).rejects.toThrow(/TikTok n’est pas connecté/);
    await expect(programmer(maintenant - 3_600_000)).rejects.toThrow(/déjà passée/);
    await db.doc('studioProjets/v1').update({ rendu: null });
    await expect(programmer()).rejects.toThrow(/pas encore prête/);
  });

  it('TikTok : un seul morceau jusqu’à 64 Mo, sinon des morceaux de 20 Mo', () => {
    expect(morceauxTiktok(1_000)).toEqual([{ debut: 0, fin: 1_000 }]);
    const Mo = 1024 * 1024;
    const m = morceauxTiktok(100 * Mo);
    expect(m).toHaveLength(5);
    expect(m.at(-1)).toEqual({ debut: 80 * Mo, fin: 100 * Mo });
    expect(morceauxTiktok(70 * Mo).at(-1)).toEqual({ debut: 40 * Mo, fin: 70 * Mo });
  });
});

describe('statistiques de vos vidéos', () => {
  it('relevé sur les trois réseaux, puis meilleures heures et résumé pour Claude', async () => {
    await programmer(maintenant);
    await publierDuesStudio(services());
    routes.unshift(
      [
        /youtube\/v3\/videos\?part=statistics/,
        () => ({
          items: [{ statistics: { viewCount: '12000', likeCount: '800', commentCount: '40' } }],
        }),
      ],
      [
        /youtubeanalytics.*elapsedVideoTimeRatio/,
        () => ({ rows: Array.from({ length: 100 }, (_, i) => [i / 100, 1 - i / 200]) }),
      ],
      [/youtubeanalytics/, () => ({ rows: [[21, 70, 35, 12]] })],
      [
        /ig-pub\/insights/,
        () => ({
          data: [
            { name: 'views', values: [{ value: 5000 }] },
            { name: 'ig_reels_avg_watch_time', values: [{ value: 15_000 }] },
          ],
        }),
      ],
      [
        /video\/query/,
        () => ({ data: { videos: [{ id: '777', view_count: 300, like_count: 5 }] } }),
      ],
    );
    maintenant += 3_600_000;
    expect(
      await releverStatsStudio({ db, horloge: () => maintenant, reseaux: config(), fetch: faux }),
    ).toEqual({
      relevees: 3,
      erreurs: 0,
    });
    const l = await listerPublicationsStudio(db, { depuis: 0, jusqua: maintenant });
    expect(l[0]!.stats).toMatchObject({
      vues: 12_000,
      retention: 0.7,
      abonnesGagnes: 35,
      dureeMoyenneS: 21,
    });
    expect(l[0]!.stats!.courbe).toHaveLength(100);
    // Instagram : 15 s regardées sur une vidéo de 30 s.
    expect(l[1]!.stats).toMatchObject({ vues: 5_000, retention: 0.5, dureeMoyenneS: 15 });
    expect(l[2]!.stats).toMatchObject({ vues: 300, likes: 5 });
    // Relevé suivant : pas avant 6 h.
    expect(
      (
        await releverStatsStudio({
          db,
          horloge: () => maintenant + 60_000,
          reseaux: config(),
          fetch: faux,
        })
      ).relevees,
    ).toBe(0);
    // Paris : 9 h UTC = 10 h ; trois vidéos à la même heure.
    expect(await meilleuresHeuresStudio(db, maintenant)).toEqual([10]);
    const resume = await resultatsPourClaudeStudio(db, maintenant);
    expect(resume.split('\n')[0]).toMatch(
      /^- « Recevez des demandes gratuites » \(YouTube Shorts\) : 12.000 vues, 70 % regardé, \+35 abonnés$/,
    );
    expect(resume.split('\n')).toHaveLength(3);
  });
});
