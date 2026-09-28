import { expect, test } from '@playwright/test';

test.describe('Acquisition artisans (/pro)', () => {
  test('?metier= : bandeau et métier présélectionné', async ({ page }) => {
    await page.goto('/pro?metier=couvreur');
    await expect(page.getByText('Couvreur · mise en relation avec des particuliers')).toBeVisible();
    await expect(page.getByLabel('Métier principal')).toHaveValue('couvreur');
  });

  test('métier obligatoire : envoi bloqué, focus sur le champ', async ({ page }) => {
    await page.goto('/pro');
    await page.getByLabel('Nom et prénom').fill('Julien Bertrand');
    await page.getByLabel('Téléphone').fill('0612345678');
    await page.getByLabel('Code postal').fill('33000');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Voir les demandes de ma zone' }).click();
    const metier = page.getByLabel('Métier principal');
    await expect(metier).toBeFocused();
    expect(await metier.evaluate((e: HTMLSelectElement) => e.validity.valueMissing)).toBe(true);
    await expect(page.getByText("L'inscription en ligne ouvre très prochainement")).toBeHidden();
  });

  test('tarifs : bascule annuel / mensuel (D24, D25)', async ({ page }) => {
    await page.goto('/pro');
    const tarifs = page.locator('#offres');
    await expect(tarifs.getByRole('radio', { name: /Annuel/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(tarifs).toContainText('958,80');
    await tarifs.getByRole('radio', { name: 'Mensuel' }).click();
    await expect(tarifs).toContainText('99,90');
    await expect(tarifs).toContainText('12,90');
  });
});
