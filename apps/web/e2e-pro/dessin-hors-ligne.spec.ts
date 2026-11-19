import { expect, test } from '@playwright/test';
import { activerPlans, nouveauPlan } from './dessinOutils';

test.beforeAll(activerPlans);

test.describe('Plans — hors ligne (DES-39)', () => {
  test('DES-39 : modifié sans réseau, gardé sur l’appareil, envoyé au retour du réseau', async ({
    page,
    context,
  }) => {
    const { plan } = await nouveauPlan(page);
    const statut = page
      .getByRole('status')
      .filter({ hasText: /Enregistré|Hors ligne|attente|Enregistrement/ });
    await expect(statut).toHaveText('Enregistré', { timeout: 10_000 });

    await context.setOffline(true);
    await plan
      .getByRole('button', { name: /^Pièce / })
      .first()
      .click({ force: true });
    if (page.viewportSize()!.width < 900)
      await page
        .getByRole('button', { name: 'Propriétés' })
        .click()
        .catch(() => undefined);
    await page.getByLabel('Type de pièce').selectOption('cuisine');
    await expect(statut).toHaveText('Hors ligne : gardé sur cet appareil', { timeout: 15_000 });

    await context.setOffline(false);
    await expect(statut).toHaveText('Enregistré', { timeout: 15_000 });
    await page.reload();
    await expect(page.getByTestId('plan-2d').getByText('Cuisine', { exact: true })).toBeVisible();
  });
});
