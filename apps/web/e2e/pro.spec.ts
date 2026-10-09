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

  test('ONB-01c : chantiers cochés ; ajouter « Zingueur » ajoute les siens ; décocher exclut', async ({
    page,
  }) => {
    await page.goto('/pro');
    await page.getByLabel(/^Métier principal/).selectOption('couvreur');
    const chantiers = page.getByRole('group', { name: 'Chantiers acceptés' });
    const coches = chantiers.getByRole('checkbox');
    await expect(coches.first()).toBeChecked();
    const avant = await coches.count();
    await page.getByLabel(/^Autres métiers/).selectOption('zingueur');
    await expect(page.getByRole('list', { name: 'Autres métiers' })).toContainText('Zingueur');
    await expect.poll(() => coches.count()).toBeGreaterThan(avant);
    for (const c of await coches.all()) await expect(c).toBeChecked();
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

  test('prospect : l’estimation reçue par email, usage de l’adresse affiché (CONVERSION S1, §7)', async ({
    page,
  }) => {
    let envoye: unknown = null;
    await page.route('**/api/pro/prospect', (r) => {
      envoye = r.request().postDataJSON();
      return r.fulfill({ status: 200, json: { ok: true, data: null } });
    });
    await page.goto('/pro?metier=couvreur');
    await page.getByLabel(/^Code postal/).fill('33000');
    const bloc = page.getByRole('form', { name: 'Recevoir l’estimation par email' });
    await expect(bloc).toContainText('Désinscription en un clic');
    await bloc.getByRole('button', { name: 'M’envoyer l’estimation' }).click();
    await expect(bloc).toContainText('Indiquez une adresse email valide.');
    await bloc.getByLabel('Email').fill('marc@exemple.fr');
    await bloc.getByRole('button', { name: 'M’envoyer l’estimation' }).click();
    await expect(page.getByText('C’est envoyé')).toBeVisible();
    expect(envoye).toMatchObject({
      email: 'marc@exemple.fr',
      metier: 'couvreur',
      codePostal: '33000',
    });
  });

  test('ACQ-02 : « Espace pro » (pied de page sur mobile) mène à la connexion ; jamais le mot « lead »', async ({
    page,
  }) => {
    await page.goto('/pro');
    const lien = page.getByRole('link', { name: /Espace pro|Connexion Pro/ }).first();
    await expect(lien).toHaveAttribute('href', /\/connexion\?espace=pro/);
    expect(await page.locator('body').innerText()).not.toMatch(/\blead/i);
  });

  test('tarifs : bascule annuel / mensuel (D24, D25)', async ({ page }) => {
    await page.goto('/pro');
    const tarifs = page.locator('#offres');
    await expect(tarifs.getByRole('radio', { name: /Annuel/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(tarifs).toContainText('958,80');
    await tarifs.getByRole('radio', { name: 'Mensuel' }).click();
    await expect(tarifs).toContainText('99,90');
    await expect(tarifs).toContainText('12,90');
  });
});
