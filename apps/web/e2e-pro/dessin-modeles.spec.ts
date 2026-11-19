import { expect, test } from '@playwright/test';
import { activerPlans, nouveauPlan } from './dessinOutils';

test.beforeAll(activerPlans);

test.describe('Plans — vrais modèles 3D (D88)', () => {
  test('D88 : un canapé posé s’affiche en 3D avec son vrai modèle, sans erreur de sécurité', async ({
    page,
  }) => {
    const erreurs: string[] = [];
    page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()));
    const { plan, ecran } = await nouveauPlan(page);
    const menu = page
      .getByRole('navigation', { name: 'Menus du plan' })
      .getByRole('button', { name: 'Équiper' });
    if ((await menu.getAttribute('aria-pressed')) !== 'true') await menu.click();
    await page
      .getByRole('button', { name: /^Séjour/ })
      .first()
      .click();
    await page.getByRole('button', { name: /^Canapé 3 places/ }).click();
    await page.waitForTimeout(400);
    const p = await ecran(3_000, 600);
    await page.mouse.click(p.x, p.y);
    await expect(plan.getByRole('button', { name: 'Canapé 3 places' })).toBeVisible();

    const modele = page.waitForResponse((r) => r.url().endsWith('/dessin/modeles/sofa_02.glb'));
    const rendu = page
      .getByRole('navigation', { name: 'Menus du plan' })
      .getByRole('button', { name: 'Rendu' });
    if ((await rendu.getAttribute('aria-pressed')) !== 'true') await rendu.click();
    await page.getByRole('button', { name: 'Vue 3D' }).click();
    expect((await modele).status()).toBe(200);
    await page.waitForTimeout(2_000);
    expect(erreurs.filter((e) => /blob:|GLTF|texture|\.glb/i.test(e))).toEqual([]);
  });
});
