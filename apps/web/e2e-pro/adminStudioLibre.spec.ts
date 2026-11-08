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
