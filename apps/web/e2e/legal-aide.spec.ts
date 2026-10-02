import { expect, test } from '@playwright/test';

test.describe('Pages légales', () => {
  test('sommaire, public, précédent / suivant', async ({ page }) => {
    await page.goto('/legal/particuliers/cgu');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Public' }).getByRole('link', { name: 'Particuliers' }),
    ).toHaveAttribute('aria-current', 'page');
    await page.getByRole('navigation', { name: 'Documents' }).getByRole('link').last().click();
    await expect(page).toHaveURL(/\/legal\/particuliers\/avis$/);
    await page.getByRole('link', { name: 'Artisans et professionnels' }).click();
    await expect(page).toHaveURL(/\/legal\/pro\/cgv$/);
  });
  test('redirections et 404', async ({ page }) => {
    await page.goto('/legal');
    await expect(page).toHaveURL(/\/legal\/particuliers\/cgu$/);
    expect((await page.goto('/legal/pro/cgu'))?.status()).toBe(404);
  });
});

test.describe('Aide et contact', () => {
  test('?sujet= présélectionne le sujet et affiche le champ de précision', async ({ page }) => {
    await page.goto('/aide?sujet=mediation');
    await expect(page.getByLabel('Votre demande concerne')).toHaveValue('mediation');
    await expect(page.getByLabel(/Nom de l'entreprise/)).toBeVisible();
    await page.getByLabel('Votre demande concerne').selectOption('question');
    await expect(page.getByLabel(/Nom de l'entreprise/)).toBeHidden();
  });
});

test('robots.txt et sitemap.xml', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Disallow: \//);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/diagnostic-immobilier/lormont');
});
