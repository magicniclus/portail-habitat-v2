import { expect, test } from '@playwright/test';
import { COMPTES, connecter, proprietaireAvecPlan } from './outils';

// docs/ACCEPTANCE.md PRO-07 : statistiques détaillées réservées aux formules avec Fiche Pro.
test.describe('Statistiques', () => {
  test('PRO-07 : Tout inclus voit ses statistiques, période dans l’URL', async ({ page }) => {
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

  test('PRO-07 et PAY-10 : sans Fiche Pro, fenêtre d’offre puis paiement', async ({ page }) => {
    await connecter(page, await proprietaireAvecPlan('gratuit'), '/pro/statistiques');
    await expect(
      page.getByRole('heading', {
        name: 'Les statistiques détaillées sont incluses dans Fiche Pro',
      }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vues par semaine' })).toHaveCount(0);
    // PAY-10 : la fonction payante ouvre la fenêtre d'offre (HT, TVA, TTC), rien ne s'active.
    await page.getByRole('button', { name: "Voir l'offre Fiche Pro" }).click();
    const offre = page.getByRole('dialog', { name: 'Passer à Fiche Pro' });
    await expect(offre).toContainText('29,00 € HT');
    await expect(offre).toContainText('34,80 €');
    // Paiement direct (choix du 27/10/2026) : CGV à accepter dans la même fenêtre, puis Stripe.
    const payer = offre.getByRole('button', { name: 'Continuer vers le paiement' });
    await expect(payer).toBeDisabled();
    await offre.getByRole('checkbox', { name: /conditions générales de vente/ }).check();
    await expect(payer).toBeEnabled();
    await expect(page.locator('input[autocomplete^="cc-"]')).toHaveCount(0);
  });
});
