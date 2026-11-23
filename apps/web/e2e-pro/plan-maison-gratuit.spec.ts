import { expect, test, type Page } from '@playwright/test';
import { activerPlans } from './dessinOutils';

/**
 * Landing SEO « plan de maison gratuit » et ses guides (demande du propriétaire du 23/11/2026) :
 * métadonnées, données structurées, maillage, essai sans compte, rien qui déborde sur téléphone.
 */
const GUIDES = ['plain-pied', 'etage', 'maison-en-l', 'appartement', 'extension', 'plan-3d'];

async function jsonLd(page: Page) {
  const blocs = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocs.map((b) => JSON.parse(b) as { '@type': string });
}

test.describe('Plan de maison gratuit', () => {
  test.beforeAll(activerPlans);

  test('landing : SEO, sommaire, guides, essai sans compte', async ({ page }) => {
    await page.goto('/plan-maison-gratuit');
    await expect(page).toHaveTitle(/^Plan de maison gratuit.*· Portail Travaux$/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('Plan de maison gratuit');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /gratuit/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/plan-maison-gratuit$/,
    );
    const types = (await jsonLd(page)).map((d) => d['@type']);
    expect(types).toEqual(expect.arrayContaining(['WebApplication', 'FAQPage', 'BreadcrumbList']));
    for (const g of GUIDES)
      await expect(page.locator(`main a[href="/plan-maison-gratuit/${g}"]`)).toHaveCount(1);
    await expect(
      page.getByRole('link', { name: 'Dessiner mon plan gratuitement' }).first(),
    ).toHaveAttribute('href', '/dessin/essai');
    await expect(page.locator('[data-curseur-plans]')).toBeVisible();
    // Sommaire : l'ancre mène à sa section.
    await page
      .getByRole('navigation', { name: 'Sommaire' })
      .getByRole('link', { name: 'Questions fréquentes' })
      .click();
    await expect(page).toHaveURL(/#questions$/);
    // Téléphone : rien ne déborde en largeur.
    const [large, visible] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(large).toBeLessThanOrEqual(visible);
  });

  test('guides : une page par sujet, reliée à la landing ; sujet inconnu introuvable', async ({
    page,
  }) => {
    const titres = new Set<string>();
    for (const g of GUIDES) {
      await page.goto(`/plan-maison-gratuit/${g}`);
      await expect(page.locator('h1')).toHaveCount(1);
      titres.add(await page.title());
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        new RegExp(`/plan-maison-gratuit/${g}$`),
      );
      await expect(
        page.getByRole('navigation', { name: 'Fil d’Ariane' }).getByRole('link', {
          name: 'Plan de maison gratuit',
        }),
      ).toHaveAttribute('href', '/plan-maison-gratuit');
      // Pas de lien vers soi-même dans « Autres plans gratuits ».
      await expect(page.locator(`main a[href="/plan-maison-gratuit/${g}"]`)).toHaveCount(0);
    }
    expect(titres.size).toBe(GUIDES.length);
    const reponse = await page.goto('/plan-maison-gratuit/inconnu');
    expect(reponse!.status()).toBe(404);
  });

  test('/dessin renvoie Google vers la landing', async ({ page }) => {
    await page.goto('/dessin');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/plan-maison-gratuit$/,
    );
  });
});
