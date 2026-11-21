import { expect, test } from '@playwright/test';
import { COMPTES, connecter, entrepriseDe } from './outils';

// ONB-03 (suite) : « Demander à rejoindre » une entreprise déjà inscrite (COMPTES §4.4).
test.describe('Rejoindre une entreprise', () => {
  test('sans compte : accès créé, demande envoyée, visible par le propriétaire', async ({
    page,
    browser,
  }, info) => {
    const artisanId = await entrepriseDe(COMPTES.proprio);
    const visiteur = await browser.newContext({ ...info.project.use });
    const p = await visiteur.newPage();
    await p.goto(`/pro/rejoindre?entreprise=${artisanId}`);
    await expect(p.getByRole('heading', { level: 1, name: /^Rejoindre / })).toBeVisible();
    await p.getByLabel(/^Votre nom et prénom/).fill('Rémi Rejoint');
    await p.getByLabel(/^Email/).fill(`rejoindre-${info.project.name}-${Date.now()}@test.local`);
    await p.getByLabel(/^Mot de passe/).fill('MotDePasse-rejoint-1');
    await p.getByLabel(/^Message pour le propriétaire/).fill('Chef de chantier');
    await p.getByRole('button', { name: 'Demander à rejoindre' }).click();
    await expect(p.getByText('Demande envoyée')).toBeVisible({ timeout: 15_000 });
    await visiteur.close();

    await connecter(page, COMPTES.proprio, '/pro/equipe');
    const demandes = page.getByRole('list', { name: 'Demandes pour rejoindre' });
    await expect(demandes).toContainText('Rémi Rejoint');
    await demandes
      .getByRole('listitem')
      .filter({ hasText: 'Rémi Rejoint' })
      .getByRole('button', { name: 'Refuser' })
      .click();
    await expect(page.getByText('Rémi Rejoint')).toHaveCount(0);
  });
});
