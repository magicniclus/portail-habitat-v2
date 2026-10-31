import { expect, test } from '@playwright/test';

test.describe('Acquisition artisans (/pro)', () => {
  test('ONB-01b : sans métier principal, envoi bloqué avec un message', async ({ page }) => {
    await page.goto('/pro');
    await page.getByLabel(/^Nom et prénom/).fill('Julien Bertrand');
    await page.getByLabel(/^Email/).fill('julien@example.fr');
    await page.getByLabel(/^Téléphone/).fill('0612345678');
    await page.getByLabel(/^Code postal/).fill('33000');
    await page.getByRole('checkbox', { name: /conditions générales/ }).check();
    await page.getByRole('button', { name: 'Voir les demandes de ma zone' }).click();
    const metier = page.getByLabel(/^Métier principal/);
    await expect(metier).toBeFocused();
    await expect(page.getByText('Choisissez votre métier dans la liste.')).toBeVisible();
    await expect(page).toHaveURL(/\/pro$/);
  });

  test('ONB-01c : chantiers du métier principal cochés ; un seul métier ; décocher exclut', async ({
    page,
  }) => {
    await page.goto('/pro');
    await page.getByLabel(/^Métier principal/).selectOption('couvreur');
    const chantiers = page.getByRole('group', { name: 'Chantiers acceptés' });
    const coches = chantiers.getByRole('checkbox');
    await expect(coches.first()).toBeChecked();
    for (const c of await coches.all()) await expect(c).toBeChecked();
    // Autres métiers : dans l'espace pro, jamais dans ce formulaire (décision du 25/10/2026).
    await expect(page.getByLabel(/^Autres métiers/)).toHaveCount(0);
    await coches.first().uncheck();
    await expect(coches.first()).not.toBeChecked();
  });

  test('ACQ-01 : ?metier=couvreur, bandeau, et même nombre de demandes que l’étape 2', async ({
    page,
  }) => {
    await page.goto('/pro?metier=couvreur');
    await expect(page.getByText('Couvreur · mise en relation avec des particuliers')).toBeVisible();
    await expect(page.getByLabel(/^Métier principal/)).toHaveValue('couvreur');
    await page.getByLabel(/^Code postal/).fill('33000');
    const attendu = (await (
      await page.request.get('/api/stats/demandes?cp=33000&metiers=couvreur&rayon=30')
    ).json()) as { total: number };
    await expect(page.getByText(`≈ ${attendu.total} demandes estimées`)).toBeVisible();
  });

  test('ACQ-02 : « Espace pro » (pied de page sur mobile) mène à la connexion ; jamais le mot « lead »', async ({
    page,
  }) => {
    await page.goto('/pro');
    const lien = page.getByRole('link', { name: /Espace pro|Connexion Pro/ }).first();
    await expect(lien).toHaveAttribute('href', /\/connexion\?espace=pro/);
    expect(await page.locator('body').innerText()).not.toMatch(/\blead/i);
  });

  test('PAY-01 : aucun prix ni formule payante avant l’inscription', async ({ page }) => {
    await page.goto('/pro');
    const html = await page.content();
    expect(html).not.toMatch(/\/pro\/abonnement/);
    const texte = await page.locator('body').innerText();
    expect(texte).not.toMatch(
      /\d+[,.]\d{2}\s?€|Premium|Fiche Pro|Site Pro|Tout inclus|abonnement/i,
    );
  });
});
