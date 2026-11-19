import { expect, test } from '@playwright/test';
import { activerPlans, nouveauPlan } from './dessinOutils';

test.beforeAll(activerPlans);

test.describe('Plans — aimant, cuisine, salle de bains, peinture, style (DES-08, DES-23 à DES-25, DES-32)', () => {
  test('DES-08, DES-23, DES-24, DES-25, DES-32 : équiper, peindre un mur, plan en noir et blanc', async ({
    page,
  }) => {
    const { plan, ecran } = await nouveauPlan(page);
    const svg = plan.locator('svg').first();
    const menu = async (nom: string) => {
      const b = page
        .getByRole('navigation', { name: 'Menus du plan' })
        .getByRole('button', { name: nom });
      if ((await b.getAttribute('aria-pressed')) !== 'true') await b.click();
    };
    const cliquer = async (x: number, y: number) => {
      const p = await ecran(x, y);
      await page.mouse.click(p.x, p.y);
    };
    const replier = async () => {
      if (page.viewportSize()!.width < 900)
        await page
          .getByRole('button', { name: 'Replier propriétés' })
          .click()
          .catch(() => undefined);
    };

    // DES-08 : magnétisme activé par défaut, coupé d'un clic.
    const aimant = page
      .getByRole('toolbar', { name: 'Outils du plan' })
      .getByRole('button', { name: 'Magnétisme' });
    await expect(aimant).toHaveAttribute('aria-pressed', 'true');
    await aimant.click();
    await expect(aimant).toHaveAttribute('aria-pressed', 'false');
    await aimant.click();

    // DES-23 : un meuble évier contre le mur du haut ; le plan de travail apparaît au métré.
    await menu('Équiper');
    await page
      .getByRole('button', { name: /^Cuisine\b/ })
      .first()
      .click();
    await page.getByRole('button', { name: /^Meuble évier/ }).click();
    await page.waitForTimeout(400);
    await cliquer(3_000, 600);
    await expect(plan.getByRole('button', { name: 'Meuble évier' })).toBeVisible();

    // DES-24 : une douche à l'italienne.
    await replier();
    await menu('Équiper');
    const retour = page
      .getByRole('region', { name: 'Équiper' })
      .getByRole('button', { name: 'Équiper', exact: true });
    if (await retour.isVisible()) await retour.click();
    await page
      .getByRole('button', { name: /^Salle de bain\b/ })
      .first()
      .click();
    await page.getByRole('button', { name: /^Douche à l’italienne/ }).click();
    await page.waitForTimeout(400);
    await cliquer(8_000, 6_500);
    await expect(plan.getByRole('button', { name: 'Douche à l’italienne' })).toBeVisible();

    await replier();
    await menu('Chiffrer');
    await expect(page.getByText('Plan de travail').first()).toBeVisible();

    // DES-25 : peinture sauge sur une face de mur.
    await page
      .getByRole('toolbar', { name: 'Outils du plan' })
      .getByRole('button', { name: 'Sélectionner' })
      .click();
    await plan
      .getByRole('button', { name: /^Mur de 10,40 m/ })
      .first()
      .click({ force: true });
    if (page.viewportSize()!.width < 900)
      await page
        .getByRole('button', { name: 'Propriétés' })
        .click()
        .catch(() => undefined);
    const sauge = page
      .getByRole('group', { name: /^Peinture côté gauche/ })
      .getByRole('button', { name: 'Sauge' });
    await sauge.click();
    await expect(sauge).toHaveAttribute('aria-pressed', 'true');

    // DES-32 : style noir et blanc imprimable.
    await replier();
    await menu('Rendu');
    await page.getByRole('checkbox', { name: /noir et blanc/ }).check();
    await expect(svg.locator('g[filter="url(#plan-noir-et-blanc)"]')).toHaveCount(1);
  });
});
