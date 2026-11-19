import { expect, test } from '@playwright/test';
import { activerPlans, nouveauPlan } from './dessinOutils';

test.beforeAll(activerPlans);

test.describe('Plans — vrais modèles 3D (D88)', () => {
  test('D88 : canapé avec son vrai modèle et parquet en texture photo dans la vue 3D, sans erreur', async ({
    page,
  }) => {
    test.setTimeout(60_000);
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

    // Parquet chêne clair au sol : texture photo en 3D.
    await page
      .getByRole('toolbar', { name: 'Outils du plan' })
      .getByRole('button', { name: 'Sélectionner' })
      .click();
    await page.waitForTimeout(400);
    const q = await ecran(6_000, 5_000);
    await page.mouse.click(q.x, q.y);
    const finitions = page
      .getByRole('navigation', { name: 'Menus du plan' })
      .getByRole('button', { name: 'Finitions' });
    if ((await finitions.getAttribute('aria-pressed')) !== 'true') await finitions.click();
    await page.getByLabel('Famille').selectOption('parquet');
    await page.getByRole('button', { name: 'Chêne clair', exact: true }).click();

    const modele = page.waitForResponse((r) => r.url().endsWith('/dessin/modeles/sofa_02.glb'));
    const texture = page.waitForResponse((r) =>
      r.url().endsWith('/dessin/textures/laminate_floor_02-couleur.webp'),
    );
    const rendu = page
      .getByRole('navigation', { name: 'Menus du plan' })
      .getByRole('button', { name: 'Rendu' });
    if ((await rendu.getAttribute('aria-pressed')) !== 'true') await rendu.click();
    await page.getByRole('button', { name: 'Vue 3D' }).click();
    expect((await modele).status()).toBe(200);
    expect((await texture).status()).toBe(200);
    await page.waitForTimeout(2_000);
    expect(erreurs.filter((e) => /blob:|GLTF|texture|\.glb/i.test(e))).toEqual([]);
  });
});
