import { expect, test } from '@playwright/test';
import { COMPTES, connecter, entrepriseDe, publierAvis } from './outils';

// Maquette Mes Avis : réponse publique unique.
test.describe('Mes avis', () => {
  test('répondre à un avis ; la réponse remplace le bouton', async ({ page }) => {
    const nom = await publierAvis(await entrepriseDe(COMPTES.proprio));
    await connecter(page, COMPTES.proprio, '/pro/avis');
    await expect(page.getByRole('heading', { level: 1, name: 'Mes avis' })).toBeVisible();
    const carte = page.getByRole('listitem').filter({ hasText: nom });
    await carte.getByRole('button', { name: 'Répondre' }).click();
    await carte.getByLabel('Votre réponse publique').fill('Merci pour votre confiance !');
    await carte.getByRole('button', { name: 'Publier la réponse' }).click();
    await expect(carte).toContainText('Votre réponse');
    await expect(carte.getByRole('button', { name: 'Répondre' })).toHaveCount(0);
  });

  test('filtre « Sans réponse » et lien à partager', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/avis');
    await page.getByRole('button', { name: 'Sans réponse' }).click();
    await expect(page.getByRole('button', { name: 'Sans réponse' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Demander un avis' }).click();
    await expect(page.getByRole('dialog', { name: 'Demander un avis' })).toContainText('/avis');
  });
});
