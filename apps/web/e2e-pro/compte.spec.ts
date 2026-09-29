import { expect, test } from '@playwright/test';
import { COMPTES, connecter, liensEnvoyes, MOT_DE_PASSE, nouveauComptePro } from './outils';

// Maquette Mon Compte (COMPTES §9) : profil, sécurité, appareils, notifications, données.

test.describe('Mon compte', () => {
  test('CON-02 : « Activer maintenant » mène à la double authentification', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/facturation');
    await page.getByRole('link', { name: 'Activer maintenant' }).click();
    await expect(page).toHaveURL(/\/pro\/compte#securite$/);
    const securite = page.getByRole('region', { name: 'Connexion et sécurité' });
    await expect(securite.getByText('Double authentification')).toBeVisible();
    await securite.getByRole('button', { name: 'Activer' }).click();
    const f = page.getByRole('dialog', { name: 'Application d’authentification' });
    await expect(f.getByLabel(/^Mot de passe actuel/)).toBeVisible();
  });

  test('propriétaire seul : suppression bloquée avec l’explication', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/compte');
    const donnees = page.getByRole('region', { name: 'Mes données' });
    await expect(
      donnees.getByText(/Impossible tant que vous êtes le seul propriétaire/),
    ).toBeVisible();
    await expect(donnees.getByRole('button', { name: 'Supprimer' })).toHaveCount(0);
  });

  test('profil et notifications enregistrés (nom, actualités, entreprise)', async ({ page }) => {
    const email = await nouveauComptePro('profil');
    await connecter(page, email, '/pro/compte');
    const profil = page.getByRole('region', { name: 'Profil' });
    await profil.getByRole('button', { name: 'Modifier le nom' }).click();
    const f = page.getByRole('dialog', { name: 'Votre nom' });
    await f.getByLabel(/^Prénom/).fill('Julien');
    await f.getByLabel(/^Nom/).fill('Bertrand');
    await f.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(profil.getByText('Julien Bertrand')).toBeVisible();

    const actus = page.getByRole('switch', { name: 'Actualités par email' });
    await expect(actus).toHaveAttribute('aria-checked', 'false');
    await actus.click();
    await expect(actus).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('switch', { name: 'Sécurité par email' })).toBeDisabled();
    await page.waitForLoadState('networkidle');
    await page.reload();
    await expect(page.getByRole('switch', { name: 'Actualités par email' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('mot de passe changé : alerte de sécurité, puis tout déconnecter', async ({ page }) => {
    const email = await nouveauComptePro('mdp');
    const alertes = (await liensEnvoyes('/aide?sujet=pro')).length;
    await connecter(page, email, '/pro/compte');
    await page.getByRole('button', { name: 'Modifier le mot de passe' }).click();
    const f = page.getByRole('dialog', { name: 'Nouveau mot de passe' });
    await f.getByLabel(/^Mot de passe actuel/).fill(MOT_DE_PASSE);
    await f.getByLabel(/^Nouveau mot de passe/).fill('MotDePasse-nouveau-1');
    await f.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(f).toHaveCount(0, { timeout: 15_000 });

    await page.getByRole('button', { name: 'Tout déconnecter' }).click();
    await page
      .getByRole('dialog', { name: 'Déconnecter tous les appareils ?' })
      .getByRole('button', { name: 'Tout déconnecter' })
      .click();
    await expect(page).toHaveURL(/\/connexion\?espace=pro/);
    await page.goto('/pro/compte');
    await expect(page).toHaveURL(/\/connexion\?espace=pro/);
    await expect
      .poll(async () => (await liensEnvoyes('/aide?sujet=pro')).length, { timeout: 15_000 })
      .toBeGreaterThan(alertes);
  });
});
