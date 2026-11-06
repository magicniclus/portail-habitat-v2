import { expect, test } from '@playwright/test';
import { COMPTES, connecter, proprietaireAvecPlan } from './outils';

// docs/ACCEPTANCE.md PRO-07 : statistiques de la fiche ouvertes à tous (06/11/2026).
test.describe('Statistiques', () => {
  test('PRO-07 : Tout inclus voit ses statistiques, période dans l’URL', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/statistiques');
    await expect(page.getByRole('heading', { name: 'Évolution sur 30 jours' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Vues de la fiche' })).toBeAttached();
    await expect(page.getByRole('table', { name: 'Appels' })).toBeAttached();
    await expect(page.getByRole('table', { name: 'Demandes de devis' })).toBeAttached();
    await page.getByRole('link', { name: '7 jours' }).click();
    await expect(page).toHaveURL(/periode=7j/);
    await expect(page.getByRole('heading', { name: 'Évolution sur 7 jours' })).toBeVisible();
    await expect(page.getByRole('link', { name: '7 jours' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('PRO-07 : sans abonnement, les statistiques sont visibles aussi', async ({ page }) => {
    await connecter(page, await proprietaireAvecPlan('gratuit'), '/pro/statistiques');
    await expect(page.getByRole('heading', { name: /Évolution sur 30 jours/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Voir l.offre/ })).toHaveCount(0);
  });
});
