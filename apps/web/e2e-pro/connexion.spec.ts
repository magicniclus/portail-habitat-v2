import { expect, test, type Page } from '@playwright/test';
import { COMPTES, connecter } from './outils';

// docs/ACCEPTANCE.md CON-01 à CON-03, sur l'émulateur Auth avec les comptes du seed.
const tenter = async (page: Page, email: string, mdp: string) => {
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Mot de passe/).fill(mdp);
  await page.getByRole('button', { name: 'Me connecter' }).click();
};

test.describe('Connexion pro', () => {
  test('CON-01 : message générique, que l’email existe ou non', async ({ page }) => {
    await page.goto('/connexion?espace=pro');
    await tenter(page, COMPTES.proprio, 'mauvais-mot-de-passe');
    const message = page.getByRole('alert').filter({ hasText: /mot de passe/ });
    await expect(message).toHaveText(/Email ou mot de passe incorrect\./);
    await tenter(page, 'personne@inconnu.test', 'mauvais-mot-de-passe');
    await expect(message).toHaveText(/Email ou mot de passe incorrect\./);
  });

  test('CON-03 : après 5 échecs, délai d’attente affiché', async ({ page }) => {
    await page.goto('/connexion?espace=pro');
    for (let i = 0; i < 5; i++) {
      await tenter(page, COMPTES.collab, `faux-${i}`);
      await expect(
        page.getByRole('alert').filter({ hasText: /incorrect|tentatives/ }),
      ).toBeVisible();
    }
    await expect(page.getByText(/Trop de tentatives : réessayez dans \d+ s/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Me connecter' })).toBeDisabled();
  });

  test('connexion réussie : session ouverte, page demandée', async ({ page, context }) => {
    await connecter(page, COMPTES.proprio, '/pro/facturation');
    expect((await context.cookies()).some((c) => c.name === '__session' && c.httpOnly)).toBe(true);
  });

  test('CON-02 : propriétaire Premium sans double authentification → activation demandée', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/facturation');
    await expect(page.getByText('Activez la double authentification')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Activer maintenant' })).toHaveAttribute(
      'href',
      '/pro/compte#securite',
    );
  });

  test('sans session : retour à la connexion pro avec la page demandée', async ({ page }) => {
    await page.goto('/pro/facturation');
    await expect(page).toHaveURL(/\/connexion\?espace=pro&suite=%2Fpro%2Ffacturation/);
  });
});
