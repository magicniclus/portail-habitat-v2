import { expect, test } from '@playwright/test';
import { COMPTES, connecter, entrepriseDe, siegesLibres } from './outils';

// docs/ACCEPTANCE.md EQU-01 à EQU-04 (maquette Equipe), sur émulateurs.
test.describe('Équipe', () => {
  test('EQU-02 : sièges pleins → « Inviter » inactif, ajout de siège proposé', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/equipe');
    await expect(page.getByRole('heading', { level: 1, name: 'Équipe' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inviter' })).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Ajouter un siège' })).toBeVisible();
  });

  test('EQU-01 : invitation « en attente », compteur de sièges mis à jour, puis annulée', async ({
    page,
  }, info) => {
    const remettre = await siegesLibres(await entrepriseDe(COMPTES.proprio), 1);
    try {
      const email = `invite-${info.project.name}-${Date.now()}@test.local`;
      await connecter(page, COMPTES.proprio, '/pro/equipe');
      const compteur = page.getByText(/siège.* utilisé.* sur \d+/);
      const avant = await compteur.textContent();
      await page.getByRole('button', { name: 'Inviter' }).click();
      const f = page.getByRole('dialog', { name: 'Inviter un membre' });
      await f.getByLabel(/^Email/).fill(email);
      await f.getByRole('button', { name: "Envoyer l'invitation" }).click();
      const attente = page.getByRole('list', { name: 'Invitations en attente' });
      await expect(attente).toContainText(email);
      await expect(attente).toContainText('En attente');
      await expect(compteur).not.toHaveText(avant!);
      await attente
        .getByRole('listitem')
        .filter({ hasText: email })
        .getByRole('button', { name: 'Annuler' })
        .click();
      await expect(page.getByText(email)).toHaveCount(0);
    } finally {
      await remettre();
    }
  });

  test('EQU-03 : un collaborateur ne voit ni « Inviter » ni les actions sur les autres', async ({
    page,
  }) => {
    await connecter(page, COMPTES.collab, '/pro/equipe');
    await expect(page.getByRole('heading', { level: 1, name: 'Équipe' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inviter' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Retirer' })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: /^Rôle de/ })).toHaveCount(0);
  });

  test('EQU-04 : le dernier propriétaire ne peut pas quitter l’équipe', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/equipe');
    await expect(page.getByText(/Vous êtes le dernier propriétaire/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Quitter l.entreprise/ })).toHaveCount(0);
  });
});
