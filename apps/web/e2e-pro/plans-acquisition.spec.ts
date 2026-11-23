import { expect, test } from '@playwright/test';
import { activerPlans } from './dessinOutils';

// Plans mis en avant sur les pages d'acquisition (demande du propriétaire du 22/11/2026), quand la
// page publique est ouverte. Pages rendues à chaque visite (le build met en cache les pages ISR).
test.describe('Plans sur les pages d’acquisition', () => {
  test.beforeAll(activerPlans);

  test('simulateur : encart Plans qui ouvre l’essai sans compte', async ({ page }) => {
    await page.goto('/simulateur');
    const encart = page.locator('[data-promo-plans="encart"]');
    await expect(encart).toBeVisible();
    await expect(encart.getByRole('link', { name: 'Dessiner mon plan' })).toHaveAttribute(
      'href',
      '/dessin/essai',
    );
    const lien = await encart.getByRole('link').boundingBox();
    expect(lien!.height).toBeGreaterThanOrEqual(44);
  });

  test('annuaire : « Plan 3D » dans l’en-tête et le pied de page', async ({ page }) => {
    await page.goto('/artisans');
    await expect(
      page.locator('footer').getByRole('link', { name: 'Plan de maison 2D et 3D' }),
    ).toHaveAttribute('href', '/dessin');
    const enTete = page.locator('header').first();
    const lienEnTete = enTete.getByRole('link', { name: 'Plan 3D' });
    // Sur téléphone, le lien est dans le menu.
    if (!(await lienEnTete.first().isVisible())) {
      await enTete.getByRole('button', { name: /menu/i }).click();
    }
    await expect(page.getByRole('link', { name: 'Plan 3D' }).first()).toHaveAttribute(
      'href',
      '/dessin',
    );
  });
});
