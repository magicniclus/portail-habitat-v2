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
      page.locator('footer').getByRole('link', { name: 'Plan de maison gratuit' }),
    ).toHaveAttribute('href', '/plan-maison-gratuit');
    const enTete = page.locator('header').first();
    const lienEnTete = enTete.getByRole('link', { name: 'Plan 3D' });
    // Sur téléphone, le lien est dans le menu.
    if (!(await lienEnTete.first().isVisible())) {
      await enTete.getByRole('button', { name: /menu/i }).click();
    }
    await expect(page.getByRole('link', { name: 'Plan 3D' }).first()).toHaveAttribute(
      'href',
      '/plan-maison-gratuit',
    );
  });

  test('curseur 2D / 3D : glisser et clavier', async ({ page }) => {
    await page.goto('/dessin');
    const curseur = page.locator('[data-curseur-plans]');
    await curseur.scrollIntoViewIfNeeded();
    await expect(curseur).toBeVisible();
    await expect(curseur.getByRole('img', { name: /Plan 2D/ })).toBeAttached();
    await expect(curseur.getByRole('img', { name: /en 3D/ })).toBeAttached();
    const reglage = curseur.getByRole('slider', { name: 'Passer du plan 2D à la vue 3D' });
    await page.waitForTimeout(2800); // fin de la démonstration du geste
    const b = (await curseur.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.25, b.y + b.height / 2, { steps: 4 });
    await page.mouse.up();
    expect(Number(await reglage.inputValue())).toBeLessThan(35);
    await reglage.focus();
    await page.keyboard.press('End');
    await expect(reglage).toHaveValue('100');
    await page.keyboard.press('Home');
    await expect(reglage).toHaveValue('0');
  });
});
