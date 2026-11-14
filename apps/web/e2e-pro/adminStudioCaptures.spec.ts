import { expect, test } from '@playwright/test';
import { admin, connecter } from './outils';

// Écrans de Portail Travaux dans le Studio (STUDIO.md §4) : artisan d'exemple relu, corrigé,
// écrans filmés par le robot. Ici sans robot branché : la raison est donnée.
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('STUDIO-CAPTURES : écrans et artisan d’exemple dans le Studio, filmer maintenant', async ({
  page,
}) => {
  const { db, Timestamp } = await admin();
  const t = Timestamp.now();
  await db.doc('studioProjets/e2e-captures').set({
    schemaVersion: 1,
    auteurUid: 'x',
    titre: 'Demandes gratuites',
    statut: 'enregistrement',
    format: 'vertical',
    camera: false,
    theme: null,
    sujets: [],
    sujet: null,
    prise: null,
    mots: [],
    plan: null,
    version: 0,
    captures: {},
    preparation: {
      artisan: {
        nom: 'Martin Plomberie',
        metier: 'plombier',
        ville: 'Bordeaux',
        demandesParMois: 10,
      },
      scenes: ['fiche_publique'],
    },
    rendu: null,
    erreur: null,
    coutCentimes: 0,
    createdAt: t,
    updatedAt: t,
  });
  await connecter(page, 'admin@test.local', '/admin/studio/e2e-captures', 'admin');
  // Idée choisie : on arrive dans le Studio ; les écrans préparés y sont déjà.
  await expect(page).toHaveURL(/\/montage$/);
  const editeur = page.getByRole('dialog', { name: /Éditeur de montage/ });
  await editeur.getByRole('tab', { name: 'Écrans' }).click();
  await expect(
    editeur.getByRole('button', { name: /La fiche de l’artisan.*Dans la vidéo, à filmer/ }),
  ).toBeVisible();

  // Artisan d'exemple relu et corrigé dans le Studio.
  await editeur.getByRole('button', { name: 'Artisan d’exemple' }).click();
  const fenetre = page.getByRole('dialog', { name: 'Artisan d’exemple' });
  await expect(fenetre.getByLabel('Nom de l’entreprise')).toHaveValue('Martin Plomberie');
  await expect(fenetre.getByLabel('Demandes par mois')).toHaveValue('10');
  await fenetre.getByLabel('Ville', { exact: true }).fill('Mérignac');
  await page.keyboard.press('Escape');

  // « Filmer maintenant » : frise enregistrée, robot appelé (absent ici : raison donnée).
  await editeur.getByRole('button', { name: 'Filmer maintenant (1)' }).click();
  await expect(
    editeur.getByRole('status').filter({ hasText: /Le robot filme les écrans/ }),
  ).toBeVisible();
  await expect
    .poll(async () => (await db.doc('studioProjets/e2e-captures').get()).get('erreur'))
    .toMatch(/robot de rendu n’est pas configuré/);
  const f = (await db.doc('studioProjets/e2e-captures').get()).get('frise');
  expect(f.artisan).toMatchObject({ nom: 'Martin Plomberie', ville: 'Mérignac' });
  expect(f.captures).toEqual([{ id: 'c1', scene: 'fiche_publique' }]);
  await db.doc('studioProjets/e2e-captures').delete();
});
