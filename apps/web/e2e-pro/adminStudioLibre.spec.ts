import { expect, test } from '@playwright/test';
import { admin, connecter } from './outils';

// Studio libre (STUDIO.md §5 bis) : monter soi-même, sans génération, dans l'éditeur
// multipistes. Gestes à la souris et grand écran : ordinateur seulement.
test.skip(({ isMobile }) => isMobile, 'éditeur multipistes à la souris');

test('STUDIO-LIBRE : nouveau montage, carton, pistes muet / solo, enregistrer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await connecter(page, 'admin@test.local', '/admin/studio', 'admin');
  // Studio › « Ouvrir le studio de montage » : nouveau montage ou projet existant.
  await page.getByRole('link', { name: /Ouvrir le studio de montage/ }).click();
  await expect(page).toHaveURL(/\/admin\/studio\/monter$/);
  await page.getByLabel('Titre du montage').fill('Montage maison');
  await page.getByRole('button', { name: 'Nouveau montage' }).click();
  await page.waitForURL(/\/admin\/studio\/[^/]+\/montage/);
  const id = page.url().split('/').at(-2)!;
  const editeur = page.getByRole('dialog', { name: /Éditeur de montage : Montage maison/ });
  await expect(editeur).toBeVisible();
  for (const piste of ['Effets', 'Vidéo 1', 'Audio 1'])
    await expect(editeur.getByLabel(`Piste ${piste}`)).toBeVisible();

  // Bibliothèque › Cartons : un clic pose le carton à la tête de lecture, réglable à droite.
  await editeur.getByRole('tab', { name: 'Cartons' }).click();
  await editeur.getByRole('button', { name: /Carton plein écran/ }).click();
  await editeur.getByLabel('Texte du carton').fill('Sans commission');
  await expect(editeur.getByRole('button', { name: 'Clip Sans commission' })).toBeVisible();
  await editeur.getByLabel('Fondu d’entrée').fill('500');

  // En-têtes de pistes : solo sur la vidéo, son coupé sur l'audio, nouvelle piste vidéo.
  await editeur.getByRole('button', { name: 'Solo Vidéo 1' }).click();
  await expect(editeur.getByRole('button', { name: 'Solo Vidéo 1' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await editeur.getByRole('button', { name: 'Couper le son de Audio 1' }).click();
  await editeur.getByLabel('Piste Audio 1').click({ position: { x: 600, y: 20 } });
  await editeur.getByRole('button', { name: '+ Vidéo' }).click();
  await expect(editeur.getByLabel('Piste Vidéo 2')).toBeVisible();

  await editeur.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(
    editeur.getByRole('status').filter({ hasText: 'Montage enregistré.' }),
  ).toBeVisible();
  const { db } = await admin();
  const f = (await db.doc(`studioProjets/${id}`).get()).data()!.frise;
  const video1 = f.pistes.find((x: { nom: string }) => x.nom === 'Vidéo 1');
  expect(video1.solo).toBe(true);
  expect(video1.clips[0].source).toEqual({ type: 'carton', texte: 'Sans commission' });
  expect(video1.clips[0].fondus.entree).toBe(500);
  expect(f.pistes.find((x: { nom: string }) => x.nom === 'Audio 1').muet).toBe(true);
  expect(f.pistes).toHaveLength(4);
});

test('STUDIO-LIBRE-FILTRES : filtres image et point d’automation sur un média', async ({
  page,
}) => {
  const { db, Timestamp } = await admin();
  const t = Timestamp.now();
  const piste = (id: string, type: string, nom: string, clips: unknown[] = []) => ({
    id,
    type,
    nom,
    muet: false,
    solo: false,
    verrou: false,
    volume: 1,
    clips,
  });
  await db.doc('studioProjets/e2e-libre').set({
    schemaVersion: 1,
    auteurUid: 'x',
    titre: 'Photos de chantier',
    titreAuto: false,
    statut: 'enregistrement',
    libre: true,
    format: 'vertical',
    camera: false,
    theme: null,
    serie: null,
    sujets: [],
    sujet: null,
    prise: null,
    plan: null,
    version: 0,
    captures: {},
    rendu: null,
    erreur: null,
    coutCentimes: 0,
    createdAt: t,
    updatedAt: t,
    frise: {
      format: 'vertical',
      titre: 'Photos de chantier',
      medias: [
        {
          id: 'm1',
          type: 'image',
          chemin: 'studio/x/medias/m1.png',
          nom: 'Salle de bains.png',
          dureeMs: 0,
          taille: 1000,
        },
      ],
      captures: [],
      artisan: null,
      sousTitres: false,
      musique: false,
      pistes: [
        piste('t1', 'texte', 'Effets'),
        piste('v1', 'video', 'Vidéo 1', [
          {
            id: 'c1',
            debut: 0,
            duree: 4000,
            source: { type: 'media', mediaId: 'm1', debutSource: 0 },
          },
        ]),
        piste('a1', 'audio', 'Audio 1'),
      ],
    },
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await connecter(page, 'admin@test.local', '/admin/studio/e2e-libre/montage', 'admin');
  const editeur = page.getByRole('dialog', { name: /Éditeur de montage/ });
  await editeur.getByRole('tab', { name: 'Médias' }).click();
  await expect(editeur.getByRole('button', { name: 'Salle de bains.png Image' })).toBeVisible();

  // Sélectionner le clip, onglet Image : noir et blanc ; tête à 1 s : point d'opacité à 50 %.
  await editeur.getByRole('button', { name: 'Clip Salle de bains.png' }).click();
  await editeur.getByRole('tab', { name: 'Image' }).click();
  await editeur.getByLabel('Noir et blanc').check();
  await editeur.getByRole('button', { name: 'Clip Salle de bains.png' }).focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  await editeur.getByLabel('Valeur du point').fill('0.5');
  await editeur.getByRole('button', { name: /Poser un point à 00:01/ }).click();
  await expect(editeur.getByText(/00:01\.00 · 50 %/)).toBeVisible();

  await editeur.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(
    editeur.getByRole('status').filter({ hasText: 'Montage enregistré.' }),
  ).toBeVisible();
  const clip = (await db.doc('studioProjets/e2e-libre').get()).data()!.frise.pistes[1].clips[0];
  expect(clip.filtres.noirEtBlanc).toBe(true);
  expect(clip.automations.opacite).toEqual([{ t: 1000, v: 0.5 }]);
});

test('STUDIO-LIBRE-CAPCUT : glisser qui pousse, transition, effet, automation, mixage, sous-titres, place dans l’image', async ({
  page,
}) => {
  const { db, Timestamp } = await admin();
  const t = Timestamp.now();
  const piste = (id: string, type: string, nom: string, clips: unknown[] = []) => ({
    id,
    type,
    nom,
    muet: false,
    solo: false,
    verrou: false,
    volume: 1,
    clips,
  });
  const clip = (id: string, debut: number) => ({
    id,
    debut,
    duree: 4000,
    source: { type: 'media', mediaId: 'm1', debutSource: 0 },
  });
  await db.doc('studioProjets/e2e-capcut').set({
    schemaVersion: 1,
    auteurUid: 'x',
    titre: 'Avant après',
    titreAuto: false,
    statut: 'enregistrement',
    libre: true,
    format: 'vertical',
    camera: false,
    theme: null,
    serie: null,
    sujets: [],
    sujet: null,
    prise: null,
    plan: null,
    version: 0,
    captures: {},
    rendu: null,
    erreur: null,
    coutCentimes: 0,
    createdAt: t,
    updatedAt: t,
    frise: {
      format: 'vertical',
      titre: 'Avant après',
      medias: [
        {
          id: 'm1',
          type: 'image',
          chemin: 'studio/x/medias/m1.png',
          nom: 'Avant.png',
          dureeMs: 0,
          taille: 1000,
        },
      ],
      captures: [],
      artisan: null,
      sousTitres: false,
      musique: false,
      pistes: [
        piste('t1', 'texte', 'Effets'),
        piste('v1', 'video', 'Vidéo 1', [clip('c1', 0), clip('c2', 4000)]),
        piste('a1', 'audio', 'Audio 1'),
      ],
    },
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await connecter(page, 'admin@test.local', '/admin/studio/e2e-capcut/montage', 'admin');
  const editeur = page.getByRole('dialog', { name: /Éditeur de montage/ });
  const clips = editeur.getByRole('button', { name: 'Clip Avant.png' });
  await expect(clips).toHaveCount(2);

  // Glisser le second clip au tout début : il suit le curseur, puis le premier glisse après lui.
  const b = (await clips.nth(1).boundingBox())!;
  const a = (await clips.nth(0).boundingBox())!;
  await page.mouse.move(b.x + 20, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 60, b.y + b.height / 2, { steps: 10 });
  await page.mouse.move(a.x + 2, b.y + b.height / 2, { steps: 4 });
  await page.mouse.up();

  // Transition et effet vidéo sur le clip choisi (celui glissé reste choisi).
  await editeur.getByRole('tab', { name: 'Transitions' }).click();
  await editeur.getByRole('button', { name: 'Fondu enchaîné' }).click();
  await editeur.getByRole('tab', { name: 'Effets', exact: true }).click();
  await editeur.getByRole('button', { name: 'Sépia' }).click();
  await expect(editeur.getByLabel('Transition d’entrée')).toHaveValue('fondu');

  // Place dans l'image : glisser le cadre du clip sur l'aperçu.
  const cadre = editeur.getByRole('group', { name: /Place du clip dans l’image/ });
  const k = (await cadre.boundingBox())!;
  await page.mouse.move(k.x + k.width / 2, k.y + k.height / 2);
  await page.mouse.down();
  await page.mouse.move(k.x + k.width / 2 + k.width / 4, k.y + k.height / 2, { steps: 5 });
  await page.mouse.up();

  // Automation dessinée sur le clip : un clic pose un point.
  await editeur.getByRole('button', { name: 'Automation' }).click();
  await editeur
    .getByRole('group', { name: /Automation de l’opacité/ })
    .click({ position: { x: 30, y: 10 } });

  // Sous-titres écrits, puis une ligne corrigée.
  await editeur.getByRole('button', { name: 'Piste des sous-titres' }).click();
  await editeur
    .getByLabel('Écrire les sous-titres')
    .fill('Avant les travaux puis après les travaux');
  await editeur.getByRole('button', { name: 'Placer ce texte' }).click();
  await editeur.getByLabel('Ligne 1 des sous-titres').fill('Regardez bien');
  await editeur.getByLabel('Ligne 1 des sous-titres').press('Enter');

  // Un clic directement sur les sous-titres dans l'aperçu les choisit.
  await editeur.getByRole('button', { name: 'Clip Avant.png' }).first().click();
  const apercu = (await editeur.getByLabel('Aperçu du montage').boundingBox())!;
  await page.mouse.click(apercu.x + apercu.width / 2, apercu.y + apercu.height * 0.76);
  await expect(editeur.getByRole('heading', { name: 'Sous-titres' })).toBeVisible();

  // Mixage : la vidéo entière (aucun clip choisi), onglet Mixage.
  await editeur.getByLabel('Piste Audio 1').click({ position: { x: 900, y: 20 } });
  await editeur.getByRole('tab', { name: 'Mixage' }).click();
  await editeur.getByRole('button', { name: 'Muet Audio 1' }).click();

  await editeur.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(
    editeur.getByRole('status').filter({ hasText: 'Montage enregistré.' }),
  ).toBeVisible();
  const f = (await db.doc('studioProjets/e2e-capcut').get()).data()!.frise;
  const v1 = f.pistes.find((x: { id: string }) => x.id === 'v1');
  expect(v1.clips.map((c: { id: string; debut: number }) => `${c.id}@${c.debut}`)).toEqual([
    'c2@0',
    'c1@4000',
  ]);
  const c2 = v1.clips[0];
  expect(c2.transition).toEqual({ type: 'fondu', duree: 500 });
  expect(c2.effets).toEqual(['sepia']);
  expect(c2.cadre.x).toBeGreaterThan(0.1);
  expect(c2.automations.opacite).toHaveLength(1);
  expect(f.motsEdites[0].texte).toBe('Regardez');
  expect(f.sousTitres).toBe(true);
  expect(f.pistes.find((x: { id: string }) => x.id === 'a1').muet).toBe(true);
});

test('STUDIO-FICHIER : vidéos du Studio servies par le serveur (morceaux), refusées sans droit', async ({
  page,
  browser,
}) => {
  const { getStorage } = await import('firebase-admin/storage');
  const chemin = 'studioRendus/e2e-fichier/captures/c1-fiche_publique.mp4';
  await getStorage()
    .bucket('demo-portail-travaux.appspot.com')
    .file(chemin)
    .save(Buffer.alloc(1000, 7), { contentType: 'video/mp4' });
  await connecter(page, 'admin@test.local', '/admin/studio', 'admin');
  const lire = (c: string, range?: string, p = page) =>
    p.evaluate(
      async ([c2, r]) => {
        const rep = await fetch(`/api/studio/fichier?c=${encodeURIComponent(c2!)}`, {
          headers: r ? { range: r } : {},
        });
        return {
          statut: rep.status,
          plage: rep.headers.get('content-range'),
          taille: (await rep.arrayBuffer()).byteLength,
        };
      },
      [c, range] as const,
    );
  expect(await lire(chemin)).toEqual({ statut: 200, plage: null, taille: 1000 });
  expect(await lire(chemin, 'bytes=100-199')).toEqual({
    statut: 206,
    plage: 'bytes 100-199/1000',
    taille: 100,
  });
  expect((await lire('studioRendus/absent.mp4')).statut).toBe(404);
  expect((await lire('artisans/x/../secret.pdf')).statut).toBe(400);
  // Sans la permission Studio (autre navigateur, modérateur) : refusé.
  const autre = await (await browser.newContext()).newPage();
  await connecter(autre, 'moderateur@test.local', '/admin', 'admin');
  expect((await lire(chemin, undefined, autre)).statut).toBe(403);
});
