import { expect, test } from '@playwright/test';
import { connecter } from './outils';

// docs/STUDIO.md, sur émulateurs (sans clés Claude ni YouTube : messages clairs).
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('studio : sans titre, Claude cherche les vidéos à faire ; vertical par défaut', async ({
  page,
}) => {
  await connecter(page, 'admin@test.local', '/admin/studio', 'admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Studio' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Studio' })).toBeVisible();
  await expect(page.getByLabel('Format')).toHaveValue('vertical');
  await expect(page.getByLabel(/Titre/)).toHaveCount(0);
  await page.getByRole('button', { name: /Trouver les meilleures vidéos à faire/ }).click();
  await expect(page).toHaveURL(/\/admin\/studio\/[^/?]+\?analyse=1/);
  await expect(page.getByRole('heading', { level: 1, name: 'Nouvelle vidéo' })).toBeVisible();
  // L'analyse part toute seule ; sans clé Claude, le message le dit.
  await expect(page.getByText(/ANTHROPIC_API_KEY/)).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer sans sujet (j’improvise)' }).click();
  await expect(page.getByText('2. Enregistrement')).toBeVisible();
  await expect(page.getByRole('button', { name: '● Démarrer l’enregistrement' })).toBeVisible();
});

test('studio : partir de son idée', async ({ page }) => {
  await connecter(page, 'admin@test.local', '/admin/studio', 'admin');
  await page.getByText('J’ai déjà une idée').click();
  await page.getByLabel('Votre idée, en quelques mots').fill('Les demandes gratuites de la fiche');
  await page.getByRole('button', { name: 'Partir de mon idée' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Les demandes gratuites de la fiche' }),
  ).toBeVisible();
});

test('studio : refusé sans la permission', async ({ page }) => {
  await connecter(page, 'moderateur@test.local', '/admin/studio', 'admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Studio' })).toHaveCount(0);
});
