import { expect, test } from '@playwright/test';
import { activerPlans, nouveauPlan } from './dessinOutils';

test.beforeAll(activerPlans);

test.describe('Plans — sélection multiple et verrous (DES-29)', () => {
  test('DES-29 : Maj + clic, tout choisir, copier sur un autre niveau, rectangle, verrouiller le plan', async ({
    page,
  }) => {
    const { plan, ecran } = await nouveauPlan(page);
    const annonce = page.getByTestId('annonce-selection');
    const murs = plan.getByRole('button', { name: /^Mur de / });

    // Maj + clic : deux murs choisis ensemble.
    await murs.nth(0).click({ force: true });
    await murs.nth(1).click({ force: true, modifiers: ['Shift'] });
    await expect(annonce).toHaveText('2 éléments choisis.');

    // Ctrl + A puis Ctrl + C ; collé sur un nouvel étage, la pièce est recréée.
    await page.keyboard.press('Control+A');
    await expect(annonce).toHaveText('4 éléments choisis.');
    await page.keyboard.press('Control+C');
    const menu = page
      .getByRole('navigation', { name: 'Menus du plan' })
      .getByRole('button', { name: 'Structure' });
    if ((await menu.getAttribute('aria-pressed')) !== 'true') await menu.click();
    await page.getByRole('button', { name: /^Niveaux/ }).click();
    await page.getByRole('checkbox', { name: 'Reprendre les murs extérieurs' }).uncheck();
    await page.getByRole('button', { name: 'Ajouter un étage' }).click();
    await expect(murs).toHaveCount(0);
    await page
      .locator('body')
      .click({ position: { x: 1, y: 1 } })
      .catch(() => undefined);
    await page.keyboard.press('Control+V');
    await expect(murs).toHaveCount(4);
    await expect(plan.getByText('83,6 m²')).toBeVisible();

    // Rectangle à la souris depuis le fond du plan (ordinateur).
    if (page.viewportSize()!.width >= 900) {
      await page.keyboard.press('Escape');
      const a = await ecran(-1_000, -1_000);
      const b = await ecran(11_000, 9_000);
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      await page.mouse.move(b.x, b.y, { steps: 5 });
      await page.mouse.up();
      await expect(annonce).toHaveText('4 éléments choisis.');
    }

    // Plan verrouillé : Suppr refusé, puis accepté une fois déverrouillé.
    await page.getByRole('button', { name: 'Verrouiller le plan' }).click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await expect(page.getByText(/Plan verrouillé/)).toBeVisible();
    await expect(murs).toHaveCount(4);
    await page.getByRole('button', { name: 'Déverrouiller le plan' }).click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    // Murs porteurs : rien n'est supprimé sans confirmation.
    await expect(page.getByText(/mur porteur/).first()).toBeVisible();
    await expect(murs).toHaveCount(4);
  });
});

test.describe('Plans — pièce libre (DES-12)', () => {
  test('DES-12 : pièce polygonale tracée point par point, fermée sur le premier point', async ({
    page,
  }) => {
    const { plan, ecran } = await nouveauPlan(page);
    const menu = page
      .getByRole('navigation', { name: 'Menus du plan' })
      .getByRole('button', { name: 'Structure' });
    if ((await menu.getAttribute('aria-pressed')) !== 'true') await menu.click();
    await page.getByRole('button', { name: /^Pièce libre/ }).click();
    await page.waitForTimeout(400);
    // Pentagone accolé à droite de la maison (10,60 m de large), dans la marge du plan.
    for (const [x, y] of [
      [10_500, 0],
      [13_300, 0],
      [13_300, 3_000],
      [12_000, 5_000],
      [10_500, 5_000],
      [10_500, 0],
    ] as const) {
      const p = await ecran(x, y);
      await page.mouse.click(p.x, p.y);
    }
    await expect(plan.getByRole('button', { name: /^Pièce / })).toHaveCount(2);
  });
});
