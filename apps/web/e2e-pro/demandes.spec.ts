import { expect, test } from '@playwright/test';
import { COMPTES, connecter, entrepriseDe, proposerDemande } from './outils';

// docs/ACCEPTANCE.md PRO-01 à PRO-03 (maquette Mes Demandes), sur émulateurs.
test.describe('Mes demandes', () => {
  test('PRO-01 et PRO-02 : arrivée en temps réel, coordonnées après acceptation', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/demandes');
    await expect(page.getByRole('heading', { level: 1, name: 'Mes demandes' })).toBeVisible();
    // Laisse l'écoute s'installer avant l'arrivée de la demande.
    await page.waitForTimeout(1500);
    const { reference } = await proposerDemande(await entrepriseDe(COMPTES.proprio));
    const carte = page.getByRole('listitem').filter({ hasText: reference });
    await expect(carte).toBeVisible({ timeout: 15_000 });
    await expect(carte).toContainText('Hélène M.');
    await expect(carte.getByRole('link', { name: /06 12 34 56 78/ })).toHaveCount(0);
    await carte.getByRole('button', { name: 'Accepter la demande' }).click();
    await expect(carte.getByRole('link', { name: /06 12 34 56 78/ })).toBeVisible();
    await expect(carte).toContainText('Hélène Marty');
  });

  test('PRO-03 : « Je m’en occupe » ; les autres voient qui traite la demande', async ({
    page,
    browser,
  }, info) => {
    const { reference } = await proposerDemande(await entrepriseDe(COMPTES.proprio));
    await connecter(page, COMPTES.collab, '/pro/demandes');
    const carte = page.getByRole('listitem').filter({ hasText: reference });
    await carte.getByRole('button', { name: /Je m.en occupe/ }).click();
    await expect(carte).toContainText('Vous vous en occupez');

    const autre = await browser.newContext({ ...info.project.use });
    const p2 = await autre.newPage();
    await connecter(p2, COMPTES.proprio, '/pro/demandes');
    await expect(p2.getByRole('listitem').filter({ hasText: reference })).toContainText(
      /Pris en charge par /,
    );
    await autre.close();
  });

  test('IMP-06 : demande partenaire, niveau et aides estimées « indicatif » ; ouverte = vue', async ({
    page,
  }) => {
    const { reference } = await proposerDemande(await entrepriseDe(COMPTES.proprio), true);
    await connecter(page, COMPTES.proprio, '/pro/demandes');
    const carte = page.getByRole('listitem').filter({ hasText: reference });
    await expect(carte.getByText('Niveau A · projet confirmé')).toBeVisible();
    await expect(carte.locator('p', { hasText: 'Aides estimées du client' })).toContainText(
      'montant indicatif',
    );
    await expect(carte.getByRole('button', { name: 'Accepter la demande' })).toBeVisible();
  });

  test('le comptable n’a pas accès aux demandes', async ({ page }) => {
    await connecter(page, COMPTES.compta, '/pro/facturation');
    await page.goto('/pro/demandes');
    await expect(page).not.toHaveURL(/\/pro\/demandes$/);
  });
});
