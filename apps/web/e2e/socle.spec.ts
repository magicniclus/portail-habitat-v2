import { expect, test } from '@playwright/test';

test('la sonde /api/health répond', async ({ request }) => {
  const reponse = await request.get('/api/health');
  expect(reponse.status()).toBe(200);
  expect(reponse.headers()['cache-control']).toContain('no-store');
  expect(await reponse.json()).toMatchObject({ statut: 'ok' });
});

test('la page d’accueil s’affiche en français, sans défilement horizontal', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const deborde = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(deborde).toBe(false);
});
