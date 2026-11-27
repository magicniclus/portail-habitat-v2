import { expect, test } from '@playwright/test';

// Pages permanentes de référencement local (métier × ville, travaux × ville) : rendues côté
// serveur, avec titre, canonique, FAQ et données structurées, et des artisans affichés.
test.describe('Pages locales', () => {
  test('« Plombier à Bordeaux » : texte, artisans, FAQ, JSON-LD, canonique', async ({ page }) => {
    await page.goto('/metiers/plombier/bordeaux');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Plombier à Bordeaux' }),
    ).toBeVisible();
    await expect(page).toHaveTitle(/Plombier à Bordeaux/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/metiers\/plombier\/bordeaux$/,
    );
    await expect(page.getByRole('heading', { name: 'Bertrand Rénovation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Questions fréquentes' })).toBeVisible();
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = ld.map((t) => (JSON.parse(t) as { '@type': string })['@type']);
    expect(types).toEqual(expect.arrayContaining(['BreadcrumbList', 'FAQPage', 'ItemList']));
  });

  test('« Douche à l’italienne à Bordeaux » : prix repère et lien vers le simulateur', async ({
    page,
  }) => {
    await page.goto('/travaux/sdb-douche/bordeaux');
    await expect(
      page.getByRole('heading', { level: 1, name: /^Douche à l.italienne à Bordeaux$/ }),
    ).toBeVisible();
    await expect(page.getByText(/Prix repère : dès 3\s500 €/)).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Estimer mon projet gratuitement' }),
    ).toHaveAttribute('href', /prestation=sdb-douche/);
  });

  test('métier ou commune inconnus : page introuvable', async ({ page }) => {
    expect((await page.goto('/metiers/astronaute/bordeaux'))?.status()).toBe(404);
    expect((await page.goto('/metiers/plombier/pas-une-commune-xyz'))?.status()).toBe(404);
  });

  test('index des métiers → page du métier → page locale', async ({ page }) => {
    await page.goto('/metiers');
    await page.getByRole('link', { name: 'Plombier', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Plombier' })).toBeVisible();
    await page.getByRole('link', { name: 'Plombier à Bordeaux' }).click();
    await expect(page).toHaveURL(/\/metiers\/plombier\/bordeaux$/);
  });
});
