import { expect, test } from '@playwright/test';
import { activerPlans, nouveauPlan } from './dessinOutils';

test.beforeAll(activerPlans);

test.describe('Plans — annotations et calques (DES-30, DES-31)', () => {
  test('DES-30, DES-31 : coter, écrire sur le plan, masquer le calque des annotations', async ({
    page,
  }) => {
    const { plan, ecran } = await nouveauPlan(page);
    const outils = page.getByRole('toolbar', { name: 'Outils du plan' });

    // DES-31 : cote libre en deux clics, dans le séjour.
    await outils.getByRole('button', { name: 'Coter (deux clics)' }).click();
    await page.waitForTimeout(400);
    let p = await ecran(2000, 2000);
    await page.mouse.click(p.x, p.y);
    p = await ecran(5000, 2000);
    await page.mouse.click(p.x, p.y);
    await expect(plan.getByRole('button', { name: /^Cote de / })).toHaveCount(1);

    // Texte : un clic le pose et le sélectionne ; son contenu se règle dans les propriétés.
    await outils.getByRole('button', { name: 'Ajouter un texte' }).click();
    await page.waitForTimeout(400);
    p = await ecran(3000, 5000);
    await page.mouse.click(p.x, p.y);
    if (page.viewportSize()!.width < 900)
      await page
        .getByRole('button', { name: 'Propriétés' })
        .click()
        .catch(() => undefined);
    await page.getByLabel('Contenu').fill('Cellier');
    await page.getByLabel('Contenu').press('Enter');
    await expect(plan.getByRole('button', { name: 'Texte Cellier' })).toHaveCount(1);

    // DES-30 : le calque des annotations masque cotes libres et textes, enregistré avec le plan.
    const menu = page
      .getByRole('navigation', { name: 'Menus du plan' })
      .getByRole('button', { name: 'Rendu' });
    if ((await menu.getAttribute('aria-pressed')) !== 'true') await menu.click();
    await page.getByRole('checkbox', { name: 'Cotes libres et textes' }).uncheck();
    await expect(plan.getByRole('button', { name: 'Texte Cellier' })).toHaveCount(0);
    await expect(plan.getByRole('button', { name: /^Cote de / })).toHaveCount(0);
    await page.getByRole('checkbox', { name: 'Cotes libres et textes' }).check();
    await expect(plan.getByRole('button', { name: 'Texte Cellier' })).toHaveCount(1);
  });
});
