import { expect, test } from '@playwright/test';
import { admin, connecter } from './outils';

// Captures avant le montage (STUDIO.md §4) : artisan d'exemple et écrans relus, corrigés, puis
// filmés par le robot. Ici sans robot branché : le message le dit et l'on peut s'en passer.
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('STUDIO-CAPTURES : relire l’artisan et les écrans, filmer, sinon monter sans', async ({
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
  // Captures préparées mais pas filmées : on arrive sur leur page.
  await expect(page).toHaveURL(/\/captures$/);
  await expect(page.getByLabel('Nom de l’entreprise')).toHaveValue('Martin Plomberie');
  await expect(page.getByLabel('Demandes par mois')).toHaveValue('10');
  await expect(page.getByRole('checkbox', { name: /La fiche de l’artisan/ })).toBeChecked();

  // Correction puis tournage par le robot (absent ici : message clair, rien de perdu).
  await page.getByLabel('Ville', { exact: true }).fill('Mérignac');
  await page.getByRole('checkbox', { name: /Les demandes reçues/ }).check();
  await page.getByRole('button', { name: 'Filmer ces écrans' }).click();
  await expect(page.getByText('Les captures n’ont pas pu être filmées')).toBeVisible();
  await expect(page.getByText(/robot de rendu n’est pas configuré/)).toBeVisible();
  const lu = (await db.doc('studioProjets/e2e-captures').get()).get('preparation');
  expect(lu).toMatchObject({ artisan: { ville: 'Mérignac' } });
  expect(lu.scenes).toEqual(['fiche_publique', 'demandes_recues']);

  await page.getByRole('button', { name: 'Monter sans captures' }).click();
  await expect(page).toHaveURL(/\/tournage$/);
  await db.doc('studioProjets/e2e-captures').delete();
});
