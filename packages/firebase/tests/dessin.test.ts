import { nouvelleScene, SCENE_VERSION, type Scene } from '@ph/core/dessin';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, bucketFichiers, PROJET_EMULATEUR } from '../src/admin';
import { chemins, fichiers, type ProprietairePlan } from '../src/chemins';
import {
  creerPlan,
  dupliquerPlan,
  enregistrerPlan,
  exporterPlans,
  lirePlan,
  lirePlanPartage,
  listerPlans,
  listerVersions,
  mettreALaCorbeille,
  partagerPlan,
  purgerCorbeilleDessin,
  QUOTA_PLANS_PARTICULIER,
  renommerPlan,
  restaurerDeLaCorbeille,
  restaurerVersion,
  revoquerPartage,
  supprimerTousLesPlans,
  enregistrerFond,
  enregistrerPhoto,
  listerPhotos,
  supprimerPhoto,
  lireFond,
  chargerParcelle,
  listerPartages,
  chercherAdresses,
} from '../src/serveur/dessin';

let db: Firestore;
let maintenant = Date.UTC(2026, 10, 18, 9);
const s = () => ({ db, bucket: bucketFichiers(), horloge: () => maintenant });
const MINUTE = 60_000;
const JOUR = 24 * 60 * MINUTE;

const PART: ProprietairePlan = { type: 'particulier', id: 'part1' };
const ENT: ProprietairePlan = { type: 'entreprise', id: 'a1' };
const ctxPart = { proprietaire: PART, uid: 'part1' };
const ctxEnt = (uid: string) => ({ proprietaire: ENT, uid });

let k = 0;
const scene = (nomNiveau = 'RDC'): Scene => {
  const s0 = nouvelleScene((p) => `${p}_test${k++}`);
  return { ...s0, niveaux: [{ ...s0.niveaux[0]!, nom: nomNiveau }] };
};
const fichiersDe = async (p: ProprietairePlan) =>
  (await bucketFichiers().getFiles({ prefix: fichiers.dossierDessin(p) }))[0].map((f) => f.name);

beforeAll(() => {
  db = getFirestore(appAdmin());
});

beforeEach(async () => {
  maintenant = Date.UTC(2026, 10, 18, 9);
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await bucketFichiers().deleteFiles({ prefix: 'dessin/', force: true });
  const m = (role: string, statut = 'actif') => ({ role, statut });
  await Promise.all([
    db.doc(chemins.membre('a1', 'p1')).set(m('proprietaire')),
    db.doc(chemins.membre('a1', 'c1')).set(m('collaborateur')),
    db.doc(chemins.membre('a1', 'x1')).set(m('comptable')),
    db.doc(chemins.membre('a1', 's1')).set(m('collaborateur', 'suspendu')),
  ]);
});

describe('créer, lire, lister', () => {
  it('scène vide par défaut, relue telle quelle', async () => {
    const { planId } = await creerPlan(s(), ctxPart, { titre: ' Maison ' });
    const plan = await lirePlan(s(), ctxPart, planId);
    expect(plan).toMatchObject({ titre: 'Maison', versionCourante: 1 });
    expect(plan.scene.version).toBe(SCENE_VERSION);
    expect(await listerPlans(s(), ctxPart)).toEqual([
      expect.objectContaining({ planId, titre: 'Maison', supprimeLe: null }),
    ]);
    expect(await fichiersDe(PART)).toHaveLength(1);
  });

  it('refuse une scène invalide sans laisser de fichier', async () => {
    await expect(creerPlan(s(), ctxPart, { titre: 'X', scene: { version: 1 } })).rejects.toThrow();
    expect(await fichiersDe(PART)).toHaveLength(0);
  });

  it(`quota de ${QUOTA_PLANS_PARTICULIER} plans actifs pour un particulier, fichier retiré`, async () => {
    for (let i = 0; i < QUOTA_PLANS_PARTICULIER; i++)
      await creerPlan(s(), ctxPart, { titre: `Plan ${i}` });
    await expect(creerPlan(s(), ctxPart, { titre: 'Un de trop' })).rejects.toMatchObject({
      code: 'PRECONDITION',
    });
    expect(await fichiersDe(PART)).toHaveLength(QUOTA_PLANS_PARTICULIER);
  });

  it('entreprise : sans quota, réservé aux membres actifs avec dessin.gerer', async () => {
    for (let i = 0; i <= QUOTA_PLANS_PARTICULIER; i++)
      await creerPlan(s(), ctxEnt('c1'), { titre: `Chantier ${i}` });
    expect(await listerPlans(s(), ctxEnt('p1'))).toHaveLength(QUOTA_PLANS_PARTICULIER + 1);
    for (const uid of ['x1', 's1', 'inconnu'])
      await expect(listerPlans(s(), ctxEnt(uid))).rejects.toMatchObject({
        code: 'PERMISSION_REFUSEE',
      });
  });

  it('un particulier ne touche qu’à ses plans', async () => {
    const { planId } = await creerPlan(s(), ctxPart, { titre: 'A' });
    await expect(lirePlan(s(), { proprietaire: PART, uid: 'autre' }, planId)).rejects.toMatchObject(
      { code: 'PERMISSION_REFUSEE' },
    );
    await expect(lirePlan(s(), ctxPart, 'Inexistant0000000000')).rejects.toMatchObject({
      code: 'INTROUVABLE',
    });
  });
});

describe('enregistrer, conflits, versions', () => {
  it('enregistre, détecte un autre onglet, ne garde qu’un fichier courant', async () => {
    const { planId } = await creerPlan(s(), ctxPart, { titre: 'A' });
    maintenant += MINUTE;
    const r = await enregistrerPlan(s(), ctxPart, {
      planId,
      versionAttendue: 1,
      scene: scene('Étage 1'),
    });
    expect(r.versionCourante).toBe(2);
    expect((await lirePlan(s(), ctxPart, planId)).scene.niveaux[0]!.nom).toBe('Étage 1');
    await expect(
      enregistrerPlan(s(), ctxPart, { planId, versionAttendue: 1, scene: scene() }),
    ).rejects.toMatchObject({ code: 'CONFLIT' });
    // Version automatique gardée (première fois) : son fichier est la scène courante.
    expect(await listerVersions(s(), ctxPart, planId)).toEqual([
      expect.objectContaining({ numero: 2, type: 'auto', nom: null }),
    ]);
    maintenant += MINUTE;
    await enregistrerPlan(s(), ctxPart, { planId, versionAttendue: 2, scene: scene('B') });
    maintenant += MINUTE;
    await enregistrerPlan(s(), ctxPart, { planId, versionAttendue: 3, scene: scene('C') });
    // Fichiers : la version 2 (historique) et la courante 4 ; la 1 et la 3 sont effacées.
    expect(await fichiersDe(PART)).toHaveLength(2);
    expect(await listerVersions(s(), ctxPart, planId)).toHaveLength(1);
  });

  it('version nommée et restauration, sans rien écraser', async () => {
    const { planId } = await creerPlan(s(), ctxPart, { titre: 'A' });
    await enregistrerPlan(s(), ctxPart, {
      planId,
      versionAttendue: 1,
      scene: scene('Avant'),
      nomVersion: 'Avant travaux',
    });
    await enregistrerPlan(s(), ctxPart, { planId, versionAttendue: 2, scene: scene('Après') });
    const r = await restaurerVersion(s(), ctxPart, { planId, numero: 2, versionAttendue: 3 });
    expect(r.versionCourante).toBe(4);
    expect((await lirePlan(s(), ctxPart, planId)).scene.niveaux[0]!.nom).toBe('Avant');
    expect((await listerVersions(s(), ctxPart, planId)).map((v) => [v.numero, v.type])).toEqual([
      [4, 'manuelle'],
      [2, 'manuelle'],
    ]);
    await expect(
      restaurerVersion(s(), ctxPart, { planId, numero: 99, versionAttendue: 4 }),
    ).rejects.toMatchObject({ code: 'INTROUVABLE' });
  });

  it('élague l’historique : plus de 30 jours au-delà des 50 dernières versions', async () => {
    const { planId } = await creerPlan(s(), ctxPart, { titre: 'A' });
    for (let v = 1; v <= 52; v++) {
      maintenant += 11 * MINUTE;
      await enregistrerPlan(s(), ctxPart, { planId, versionAttendue: v, scene: scene() });
    }
    expect(await listerVersions(s(), ctxPart, planId)).toHaveLength(52);
    maintenant += 31 * JOUR;
    await enregistrerPlan(s(), ctxPart, { planId, versionAttendue: 53, scene: scene() });
    expect(await listerVersions(s(), ctxPart, planId)).toHaveLength(50);
  });

  it('renommer et dupliquer', async () => {
    const { planId } = await creerPlan(s(), ctxPart, { titre: 'A', scene: scene('Garage') });
    await renommerPlan(s(), ctxPart, { planId, titre: 'Maison' });
    const copie = await dupliquerPlan(s(), ctxPart, planId);
    expect(await lirePlan(s(), ctxPart, copie.planId)).toMatchObject({
      titre: 'Copie de Maison',
      scene: { niveaux: [expect.objectContaining({ nom: 'Garage' })] },
    });
  });
});

describe('corbeille et purge', () => {
  it('libère le quota, se restaure, purge après 30 jours avec les fichiers', async () => {
    const ids: string[] = [];
    for (let i = 0; i < QUOTA_PLANS_PARTICULIER; i++)
      ids.push((await creerPlan(s(), ctxPart, { titre: `P${i}` })).planId);
    await mettreALaCorbeille(s(), ctxPart, ids[0]!);
    await expect(
      enregistrerPlan(s(), ctxPart, { planId: ids[0]!, versionAttendue: 1, scene: scene() }),
    ).rejects.toMatchObject({ code: 'PRECONDITION' });
    const libre = await creerPlan(s(), ctxPart, { titre: 'Nouveau' });
    await expect(restaurerDeLaCorbeille(s(), ctxPart, ids[0]!)).rejects.toMatchObject({
      code: 'PRECONDITION',
    });
    await mettreALaCorbeille(s(), ctxPart, libre.planId);
    await restaurerDeLaCorbeille(s(), ctxPart, ids[0]!);
    await restaurerDeLaCorbeille(s(), ctxPart, ids[0]!);

    maintenant += 29 * JOUR;
    expect(await purgerCorbeilleDessin(s())).toEqual({ supprimes: 0 });
    maintenant += 2 * JOUR;
    expect(await purgerCorbeilleDessin(s())).toEqual({ supprimes: 1 });
    expect((await db.doc(chemins.plan(PART, libre.planId)).get()).exists).toBe(false);
    expect(await fichiersDe(PART)).toHaveLength(QUOTA_PLANS_PARTICULIER);
  });

  it('purge aussi les plans d’entreprise à la corbeille', async () => {
    const { planId } = await creerPlan(s(), ctxEnt('p1'), { titre: 'Chantier' });
    await mettreALaCorbeille(s(), ctxEnt('p1'), planId);
    maintenant += 31 * JOUR;
    expect(await purgerCorbeilleDessin(s())).toEqual({ supprimes: 1 });
    expect(await fichiersDe(ENT)).toHaveLength(0);
  });
});

describe('partage en lecture seule', () => {
  it('lisible sans compte, révocable, expirable, propre au propriétaire', async () => {
    const { planId } = await creerPlan(s(), ctxPart, { titre: 'Maison', scene: scene('Séjour') });
    const { jeton } = await partagerPlan(s(), ctxPart, { planId });
    expect(jeton).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(await lirePlanPartage(s(), jeton)).toMatchObject({
      titre: 'Maison',
      scene: { niveaux: [expect.objectContaining({ nom: 'Séjour' })] },
    });
    const partage = (await db.doc(chemins.partagePlan(jeton)).get()).data()!;
    expect(JSON.stringify(partage)).not.toMatch(/@|\+33/);

    await expect(revoquerPartage(s(), ctxEnt('p1'), jeton)).rejects.toMatchObject({
      code: 'INTROUVABLE',
    });
    expect((await listerPartages(s(), ctxPart, planId)).map((p) => p.jeton)).toEqual([jeton]);
    await expect(listerPartages(s(), ctxEnt('p1'), planId)).rejects.toBeTruthy();
    await revoquerPartage(s(), ctxPart, jeton);
    expect(await listerPartages(s(), ctxPart, planId)).toEqual([]);
    await expect(lirePlanPartage(s(), jeton)).rejects.toMatchObject({ code: 'INTROUVABLE' });

    const court = await partagerPlan(s(), ctxPart, { planId, joursValidite: 1 });
    maintenant += 2 * JOUR;
    await expect(lirePlanPartage(s(), court.jeton)).rejects.toMatchObject({ code: 'INTROUVABLE' });

    const suivant = await partagerPlan(s(), ctxPart, { planId });
    await mettreALaCorbeille(s(), ctxPart, planId);
    await expect(lirePlanPartage(s(), suivant.jeton)).rejects.toMatchObject({
      code: 'INTROUVABLE',
    });
    await expect(lirePlanPartage(s(), 'x'.repeat(32))).rejects.toMatchObject({
      code: 'INTROUVABLE',
    });
  });
});

describe('RGPD', () => {
  it('export des plans avec leur scène, puis suppression complète', async () => {
    const { planId } = await creerPlan(s(), ctxPart, { titre: 'Maison', scene: scene('Cuisine') });
    await enregistrerPlan(s(), ctxPart, { planId, versionAttendue: 1, scene: scene('Cuisine') });
    const exp = await exporterPlans(s(), 'part1');
    expect(exp).toEqual([
      expect.objectContaining({
        titre: 'Maison',
        scene: expect.objectContaining({ version: SCENE_VERSION }),
      }),
    ]);
    await supprimerTousLesPlans(s(), PART);
    expect(await fichiersDe(PART)).toHaveLength(0);
    expect((await db.collection(chemins.plans(PART)).get()).size).toBe(0);
    expect((await db.collection(chemins.versionsPlan(PART, planId)).get()).size).toBe(0);
  });
});

describe('plan importé (D91)', () => {
  const PNG = Buffer.from(
    '89504e470d0a1a0a0000000d4948445200000001000000010806000000',
    'hex',
  ).toString('base64');

  it('enregistre une image vérifiée et la relit, seulement dans le dossier du plan', async () => {
    const { planId } = await creerPlan(s(), ctxPart, { titre: 'A' });
    const { storagePath } = await enregistrerFond(s(), ctxPart, {
      planId,
      type: 'image/png',
      base64: PNG,
    });
    expect(storagePath).toMatch(
      new RegExp(`^${fichiers.dossierPlan(PART, planId)}fond-[0-9a-f]{12}\\.png$`),
    );
    const { url } = await lireFond(s(), ctxPart, { planId, storagePath });
    expect(url).toBe(`data:image/png;base64,${PNG}`);

    await expect(
      lireFond(s(), ctxPart, {
        planId,
        storagePath: `${fichiers.dossierPlan(PART, planId)}r1.json.gz`,
      }),
    ).rejects.toMatchObject({ code: 'INTROUVABLE' });
    await expect(
      lireFond(s(), ctxPart, {
        planId,
        storagePath: `${fichiers.dossierPlan(PART, planId)}fond-absent.png`,
      }),
    ).rejects.toMatchObject({ code: 'INTROUVABLE' });
    await expect(
      lireFond(s(), { proprietaire: PART, uid: 'autre' }, { planId, storagePath }),
    ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
  });

  it('un seul plan importé par plan : le précédent fichier est supprimé (COUTS)', async () => {
    const { planId } = await creerPlan(s(), ctxPart, { titre: 'A' });
    const PNG1 = Buffer.from(
      '89504e470d0a1a0a0000000d4948445200000001000000010806000000',
      'hex',
    ).toString('base64');
    await enregistrerFond(s(), ctxPart, { planId, type: 'image/png', base64: PNG1 });
    await enregistrerFond(s(), ctxPart, { planId, type: 'image/png', base64: PNG1 });
    expect((await fichiersDe(PART)).filter((f) => f.includes('/fond-'))).toHaveLength(1);
  });

  it('refuse un fichier qui n’est pas une image, ou trop lourd', async () => {
    const { planId } = await creerPlan(s(), ctxPart, { titre: 'A' });
    const texte = Buffer.from('<script>alert(1)</script>').toString('base64');
    await expect(
      enregistrerFond(s(), ctxPart, { planId, type: 'image/jpeg', base64: texte }),
    ).rejects.toMatchObject({ code: 'ENTREE_INVALIDE' });
    const lourd = Buffer.alloc(3 * 1024 * 1024 + 1, 0xff).toString('base64');
    await expect(
      enregistrerFond(s(), ctxPart, { planId, type: 'image/jpeg', base64: lourd }),
    ).rejects.toMatchObject({ code: 'ENTREE_INVALIDE' });
    const webp = Buffer.concat([Buffer.from('RIFF0000WEBP', 'latin1'), Buffer.alloc(8)]).toString(
      'base64',
    );
    await expect(
      enregistrerFond(s(), ctxPart, { planId, type: 'image/webp', base64: webp }),
    ).resolves.toMatchObject({ storagePath: expect.stringMatching(/\.webp$/) });
  });
});

describe('galerie « Mes photos » (DES-37)', () => {
  const JPEG = Buffer.from('ffd8ffe000104a464946', 'hex').toString('base64');

  it('ajoute une photo vérifiée, la liste (récente d’abord), la relit et la supprime', async () => {
    const { planId } = await creerPlan(s(), ctxPart, { titre: 'A' });
    const a = await enregistrerPhoto(s(), ctxPart, { planId, base64: JPEG });
    maintenant += 1_000;
    const b = await enregistrerPhoto(s(), ctxPart, { planId, base64: JPEG });
    expect(a.storagePath).toMatch(
      new RegExp(`^${fichiers.dossierPlan(PART, planId)}photos/photo-\\d+-[0-9a-f]{12}\\.jpg$`),
    );
    const { photos } = await listerPhotos(s(), ctxPart, { planId });
    expect(photos.map((p) => p.storagePath)).toEqual([b.storagePath, a.storagePath]);
    expect(photos[0]!.creeLe).toBe(maintenant);
    const { url } = await lireFond(s(), ctxPart, { planId, storagePath: a.storagePath });
    expect(url).toBe(`data:image/jpeg;base64,${JPEG}`);
    await supprimerPhoto(s(), ctxPart, { planId, storagePath: a.storagePath });
    expect((await listerPhotos(s(), ctxPart, { planId })).photos).toHaveLength(1);
    // Seulement une photo de CE plan.
    await expect(
      supprimerPhoto(s(), ctxPart, {
        planId,
        storagePath: `${fichiers.dossierPlan(PART, planId)}r1.json.gz`,
      }),
    ).rejects.toMatchObject({ code: 'INTROUVABLE' });
    await expect(
      listerPhotos(s(), { proprietaire: PART, uid: 'autre' }, { planId }),
    ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
  });

  it('refuse ce qui n’est pas un JPEG, et au-delà de 30 photos', async () => {
    const { planId } = await creerPlan(s(), ctxPart, { titre: 'A' });
    const png = Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');
    await expect(enregistrerPhoto(s(), ctxPart, { planId, base64: png })).rejects.toMatchObject({
      code: 'ENTREE_INVALIDE',
    });
    for (let i = 0; i < 30; i++) await enregistrerPhoto(s(), ctxPart, { planId, base64: JPEG });
    await expect(enregistrerPhoto(s(), ctxPart, { planId, base64: JPEG })).rejects.toMatchObject({
      code: 'PRECONDITION',
    });
  });
});

describe('implantation : adresse, parcelle, photo aérienne (DES-35)', () => {
  const JPEG_IGN = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const carre = [
    [3, 46.5],
    [3.0004, 46.5],
    [3.0004, 46.5003],
    [3, 46.5003],
    [3, 46.5],
  ];
  /** Faux services IGN : réponses selon l'URL appelée ; `wms` : ce que renvoie la photo. */
  const faux = (wms: 'jpeg' | 'erreur' | 'xml' = 'jpeg', parcelles = 1): typeof fetch =>
    (async (url: string) => {
      const u = String(url);
      if (u.includes('geocodage'))
        return Response.json({
          features: [
            {
              geometry: { coordinates: [3, 46.5] },
              properties: { label: '1 Rue Test 03000 Ville' },
            },
          ],
        });
      if (u.includes('cadastre'))
        return Response.json({
          features: Array.from({ length: parcelles }, () => ({
            geometry: { type: 'MultiPolygon', coordinates: [[carre]] },
            properties: { idu: '03190000AB0012', code_insee: '03190' },
          })),
        });
      if (wms === 'erreur') return new Response('', { status: 503 });
      if (wms === 'xml')
        return new Response('<ServiceException/>', { headers: { 'content-type': 'text/xml' } });
      return new Response(JPEG_IGN, { headers: { 'content-type': 'image/jpeg' } });
    }) as typeof fetch;

  it('adresses proposées ; service en panne : INDISPONIBLE', async () => {
    expect(await chercherAdresses('1 rue test', faux())).toEqual([
      { libelle: '1 Rue Test 03000 Ville', lon: 3, lat: 46.5 },
    ]);
    const panne = (async () => new Response('', { status: 500 })) as unknown as typeof fetch;
    await expect(chercherAdresses('1 rue test', panne)).rejects.toMatchObject({
      code: 'INDISPONIBLE',
    });
    const illisible = (async () => Response.json({ rien: 1 })) as unknown as typeof fetch;
    await expect(chercherAdresses('1 rue test', illisible)).rejects.toMatchObject({
      code: 'INDISPONIBLE',
    });
  });

  it('parcelle en Lambert-93 et photo aérienne enregistrée une fois dans le dossier du plan', async () => {
    const { planId } = await creerPlan(s(), ctxPart, { titre: 'A' });
    const e = { planId, lon: 3.0002, lat: 46.5001 };
    const p = await chargerParcelle(s(), ctxPart, e, faux());
    expect(p.reference).toBe('03190000AB0012');
    expect(p.codeInsee).toBe('03190');
    expect(p.contour).toHaveLength(4);
    expect(Math.abs(p.contour[0]!.x - 700_000_000)).toBeLessThan(500);
    const em = p.orthophoto!.emprise;
    expect(em.x1 - em.x0).toBe(em.y1 - em.y0); // photo carrée : parcelle + 25 m de marge
    expect(em.x1 - em.x0).toBeGreaterThan(80_000);
    expect(p.orthophoto!.storagePath).toMatch(/ortho-[0-9a-f]{12}\.jpg$/);
    const { url } = await lireFond(s(), ctxPart, {
      planId,
      storagePath: p.orthophoto!.storagePath,
    });
    expect(url).toBe(`data:image/jpeg;base64,${JPEG_IGN.toString('base64')}`);
    // Une nouvelle parcelle remplace l'ancienne photo.
    await chargerParcelle(s(), ctxPart, e, faux());
    expect((await fichiersDe(PART)).filter((f) => f.includes('ortho-'))).toHaveLength(1);
  });

  it('sans photo si le service d’images échoue ; aucune parcelle : INTROUVABLE', async () => {
    const { planId } = await creerPlan(s(), ctxPart, { titre: 'A' });
    const e = { planId, lon: 3.0002, lat: 46.5001 };
    expect((await chargerParcelle(s(), ctxPart, e, faux('erreur'))).orthophoto).toBeUndefined();
    expect((await chargerParcelle(s(), ctxPart, e, faux('xml'))).orthophoto).toBeUndefined();
    await expect(chargerParcelle(s(), ctxPart, e, faux('jpeg', 0))).rejects.toMatchObject({
      code: 'INTROUVABLE',
    });
    await expect(
      chargerParcelle(s(), { proprietaire: PART, uid: 'autre' }, e, faux()),
    ).rejects.toBeTruthy();
  });
});
