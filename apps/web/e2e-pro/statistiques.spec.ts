import { expect, test } from '@playwright/test';
import { COMPTES, connecter, proprietaireAvecPlan } from './outils';

// docs/ACCEPTANCE.md PRO-07 : Statistiques réservées aux Premium.
test.describe('Statistiques', () => {
  test('PRO-07 : Premium voit ses statistiques, période dans l’URL', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/statistiques');
    await expect(page.getByRole('heading', { name: 'Vues par semaine' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Vues de la fiche par semaine' })).toBeAttached();
    await page.getByRole('link', { name: '7 jours' }).click();
    await expect(page).toHaveURL(/periode=7j/);
    await expect(page.getByRole('link', { name: '7 jours' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('PRO-07 : hors Premium, présentation de l’offre', async ({ page }) => {
    await connecter(page, await proprietaireAvecPlan('gratuit'), '/pro/statistiques');
    await expect(
      page.getByRole('heading', { name: 'Les statistiques sont réservées à Premium' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Découvrir Premium' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vues par semaine' })).toHaveCount(0);
  });
});
