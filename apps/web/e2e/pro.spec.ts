import { expect, test } from '@playwright/test';

test.describe('Acquisition artisans (/pro)', () => {
  test('ONB-01b : sans métier principal, envoi bloqué avec un message', async ({ page }) => {
    await page.goto('/pro');
    await page.getByLabel(/^Email/).fill('julien@example.fr');
    await page.getByLabel(/^Code postal/).fill('33000');
    await page.getByRole('button', { name: 'Voir les demandes de ma zone' }).click();
    const metier = page.getByLabel(/^Métier principal/);
    await expect(metier).toBeFocused();
    await expect(page.getByText('Choisissez votre métier dans la liste.')).toBeVisible();
    await expect(page).toHaveURL(/\/pro$/);
  });

  test('ONB-01c : chantiers tous acceptés et repliés ; choisir le métier ne change pas la hauteur ; décocher exclut', async ({
    page,
  }) => {
    await page.goto('/pro');
    const formulaire = page.locator('[data-formulaire-inscription]');
    const hauteur = () => formulaire.evaluate((f) => f.getBoundingClientRect().height);
    const avant = await hauteur();
    await page.getByLabel(/^Métier principal/).selectOption('couvreur');
    await expect(page.getByText('Tous les chantiers')).toBeVisible();
    expect(await hauteur()).toBe(avant);
    await expect(page.getByRole('group', { name: 'Chantiers acceptés' })).toHaveCount(0);
    // Plus de nom, de téléphone ni de case dans le premier formulaire.
    await expect(page.getByLabel(/^Nom et prénom/)).toHaveCount(0);
    await expect(page.getByLabel(/^Téléphone/)).toHaveCount(0);
    await expect(page.getByRole('checkbox', { name: /conditions générales/ })).toHaveCount(0);
    await expect(page.getByText(/En continuant, vous acceptez les/)).toBeVisible();
    await expect(page.getByText('Gratuit · sans carte bancaire · 2 minutes')).toBeVisible();
    await page.getByRole('button', { name: 'Modifier mes chantiers' }).click();
    const chantiers = page.getByRole('group', { name: 'Chantiers acceptés' });
    const coches = chantiers.getByRole('checkbox');
    for (const c of await coches.all()) await expect(c).toBeChecked();
    // Autres métiers : dans l'espace pro, jamais dans ce formulaire (décision du 25/10/2026).
    await expect(page.getByLabel(/^Autres métiers/)).toHaveCount(0);
    await coches.first().uncheck();
    await expect(coches.first()).not.toBeChecked();
    await expect(page.getByText(/chantiers? sur \d+/)).toBeVisible();
  });

  test('ACQ-05 : erreurs sous le champ, saisie gardée', async ({ page }) => {
    await page.goto('/pro');
    await page.getByLabel(/^Métier principal/).selectOption('couvreur');
    await page.getByLabel(/^Code postal/).fill('330');
    await page.getByLabel(/^Email/).fill('julien@');
    await page.getByRole('button', { name: 'Voir les demandes de ma zone' }).click();
    await expect(page.getByLabel(/^Code postal/)).toHaveValue('330');
    await expect(page.getByLabel(/^Email/)).toHaveValue('julien@');
    await expect(page.getByLabel(/^Code postal/)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel(/^Code postal/)).toHaveAttribute('inputmode', 'numeric');
    await expect(page.getByLabel(/^Email/)).toHaveAttribute('type', 'email');
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
