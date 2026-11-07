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

  test('filtre « Sans réponse » et lien direct à partager (copie, email)', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/avis');
    await page.getByRole('button', { name: 'Sans réponse' }).click();
    await expect(page.getByRole('button', { name: 'Sans réponse' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Demander un avis' }).click();
    const fenetre = page.getByRole('dialog', { name: 'Demander un avis' });
    // Lien direct vers le formulaire d'avis de l'entreprise, copiable et envoyable par email.
    const lien = fenetre.getByText(/\/avis\?entreprise=/);
    await expect(lien).toBeVisible();
    await expect(fenetre.getByRole('button', { name: 'Copier' })).toBeVisible();
    const email = fenetre.getByRole('link', { name: 'Envoyer par email' });
    await expect(email).toHaveAttribute('href', /^mailto:\?subject=Votre%20avis%20sur/);
    await expect(email).toHaveAttribute('href', /entreprise%3D/);
    const url = (await lien.textContent())!;
    await page.goto(url);
    await expect(page.getByRole('heading', { name: /^Votre avis sur / }).first()).toBeVisible();
    await expect(page.getByRole('searchbox')).toHaveCount(0);
  });
});
