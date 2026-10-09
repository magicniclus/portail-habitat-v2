import { expect, test } from '@playwright/test';

test.describe('pages d’erreur', () => {
  test('ERR-01 : une URL inconnue renvoie 404 avec recherche et liens utiles', async ({ page }) => {
    const reponse = await page.goto('/cette-page-n-existe-pas');
    expect(reponse?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Cette page a été déplacée.',
    );
    await expect(
      page.getByRole('searchbox', { name: 'Rechercher un artisan ou un métier' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Simulateur de devis' })).toBeVisible();
  });

  test('ERR-01 : une URL inconnue de l’espace pro affiche la 404 pro', async ({ page }) => {
    const reponse = await page.goto('/pro/inconnue');
    expect(reponse?.status()).toBe(404);
    await expect(page.getByText('PRO', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mes demandes' })).toBeVisible();
  });

  test('ERR-02 : une erreur serveur affiche la 500 avec un identifiant d’incident', async ({
    page,
  }) => {
    const reponse = await page.goto('/test-erreur');
    expect(reponse?.status()).toBe(500);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Un souci technique de notre côté.',
    );
    await expect(page.getByTestId('incident')).toHaveText(/^PH-ERR-[0-9a-z]{8}$/);
  });

  test('la page de maintenance s’affiche', async ({ page }) => {
    await page.goto('/maintenance');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Nous améliorons Portail Habitat.',
    );
  });
});
