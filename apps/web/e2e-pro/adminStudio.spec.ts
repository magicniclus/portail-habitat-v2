import { expect, test } from '@playwright/test';
import { connecter } from './outils';

// docs/STUDIO.md, sur émulateurs (sans clés Claude ni YouTube : messages clairs).
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('studio : créer une vidéo, format vertical par défaut, étapes affichées', async ({ page }) => {
  await connecter(page, 'admin@test.local', '/admin/studio', 'admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Studio' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Studio' })).toBeVisible();
  await expect(page.getByLabel('Format')).toHaveValue('vertical');
  await page.getByLabel('Titre (pour vous retrouver)').fill('Demandes gratuites');
  await page.getByRole('button', { name: 'Créer la vidéo' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Demandes gratuites' })).toBeVisible();
  await expect(page.getByText('1. Sujet et script')).toBeVisible();
  await page.getByRole('button', { name: 'Analyser les tendances et proposer' }).click();
  await expect(page.getByText(/ANTHROPIC_API_KEY/)).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer sans sujet (j’improvise)' }).click();
  await expect(page.getByText('2. Enregistrement')).toBeVisible();
  await expect(page.getByRole('button', { name: '● Démarrer l’enregistrement' })).toBeVisible();
});

test('studio : refusé sans la permission', async ({ page }) => {
  await connecter(page, 'moderateur@test.local', '/admin/studio', 'admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Studio' })).toHaveCount(0);
});
