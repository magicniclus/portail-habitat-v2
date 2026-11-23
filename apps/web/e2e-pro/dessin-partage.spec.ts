import { expect, test } from '@playwright/test';
import { activerPlans } from './dessinOutils';
import { COMPTES, connecter } from './outils';

test.beforeAll(activerPlans);

test.describe('Plans — exports, partage, essai (DES-03, DES-41 à DES-43)', () => {
  test('DES-41, DES-43 : exports : métré à cocher, CSV, PDF à l’échelle avec annexe, image PNG', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/plans');
    await page
      .getByRole('button', { name: /Nouveau plan|Créer mon premier plan/ })
      .first()
      .click();
    await page.getByLabel('Largeur hors tout (cm)').fill('1060');
    await page.getByLabel('Profondeur hors tout (cm)').fill('860');
    await page.getByRole('button', { name: 'Créer le plan' }).click();
    await expect(page.getByTestId('plan-2d').getByText('83,6 m²')).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Menus du plan' })
      .getByRole('button', { name: 'Chiffrer' })
      .click();
    // DES-43 : décocher les plafonds les retire du CSV.
    await page.getByRole('checkbox', { name: /Plafonds/ }).uncheck();
    const [csv] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Métré en CSV (Excel)' }).click(),
    ]);
    const texte = (await import('node:fs')).readFileSync((await csv.path())!, 'utf8');
    expect(texte).toContain('Revêtement de sol;83,64;m²');
    expect(texte).not.toContain('Plafonds');
    // DES-41 : échelle et format conseillés (1/50, A3) ; A4 au 1/50 refusé avec un message clair.
    await expect(page.getByLabel('Format')).toHaveValue('A3');
    await page.getByLabel('Format').selectOption('A4');
    await page.getByRole('button', { name: 'PDF à l’échelle' }).click();
    await expect(page.getByText(/ne tient pas en A4 au 1\/50/)).toBeVisible();
    await page.getByLabel('Format').selectOption('A3');
    const [pdf] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'PDF à l’échelle' }).click(),
    ]);
    expect(pdf.suggestedFilename()).toMatch(/^plan-\d{12}\.pdf$/);
    const octets = (await import('node:fs')).readFileSync((await pdf.path())!);
    expect(octets.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const [png] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Image PNG du plan' }).click(),
    ]);
    expect(png.suggestedFilename()).toMatch(/\.png$/);
  });

  test('DES-42 : partage : lien en lecture seule ouvert sans compte, sans localisation, puis révoqué', async ({
    page,
    browser,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/plans');
    await page
      .getByRole('button', { name: /Nouveau plan|Créer mon premier plan/ })
      .first()
      .click();
    await page.getByLabel('Largeur hors tout (cm)').fill('1060');
    await page.getByLabel('Profondeur hors tout (cm)').fill('860');
    await page.getByRole('button', { name: 'Créer le plan' }).click();
    await expect(page.getByTestId('plan-2d').getByText('83,6 m²')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Enregistré' })).toBeAttached({
      timeout: 10_000,
    });
    await page
      .getByRole('navigation', { name: 'Menus du plan' })
      .getByRole('button', { name: 'Rendu' })
      .click();
    await page.getByLabel('Validité du lien').selectOption('7');
    await page.getByRole('button', { name: 'Créer un lien de partage' }).click();
    const lien = page.getByTestId('lien-partage');
    await expect(lien).toHaveCount(1);
    await expect(lien).toContainText('jusqu’au');
    // Le lien n'est affiché qu'une fois, à sa création (seule son empreinte est gardée).
    const adresse = await page.getByTestId('lien-nouveau').inputValue();
    const href = new URL(adresse).pathname;
    expect(href).toMatch(/^\/plan\/[A-Za-z0-9_-]{32}$/);
    await expect(lien).not.toContainText(href.slice(6));

    // DES-42 : sans compte, en lecture seule, non indexé.
    const invite = await browser.newContext();
    const vue = await invite.newPage();
    await vue.goto(href);
    await expect(vue.getByText('Lecture seule')).toBeVisible();
    await expect(vue.getByTestId('plan-2d').getByText('83,6 m²')).toBeVisible();
    await expect(vue.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await vue.getByRole('radio', { name: 'Façades' }).click();
    await expect(vue.getByRole('img', { name: 'Façade sud' })).toBeVisible();

    await page.getByRole('button', { name: 'Révoquer le lien' }).click();
    await expect(lien).toHaveCount(0);
    const apres = await vue.goto(href);
    expect(apres!.status()).toBe(404);
    await invite.close();
  });

  test('DES-03 : page publique, essai sans compte gardé sur l’appareil, repris après connexion', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    // Serveur à froid : la toute première lecture des flags peut dépasser 2,5 s (repli « éteint »).
    await expect(async () => {
      await page.goto('/dessin');
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Dessinez le plan', {
        timeout: 2_000,
      });
    }).toPass({ timeout: 20_000 });
    await page.getByRole('link', { name: 'Essayer gratuitement' }).first().click();
    await expect(page.getByText('Essai sans compte')).toBeVisible();
    // Une pièce rectangulaire de deux clics (sur téléphone, le menu est replié au départ).
    const structure = page
      .getByRole('navigation', { name: 'Menus du plan' })
      .getByRole('button', { name: 'Structure' });
    if ((await structure.getAttribute('aria-pressed')) !== 'true') await structure.click();
    await page.getByRole('button', { name: /^Pièce rectangulaire/ }).click();
    const svg = page.getByTestId('plan-2d').locator('svg');
    const boite = (await svg.boundingBox())!;
    // Sous le bandeau de l'essai (plus haut sur téléphone, où le menu s'est replié).
    const [y1, y2] = page.viewportSize()!.width < 900 ? [0.5, 0.75] : [0.35, 0.7];
    await page.mouse.click(boite.x + boite.width * 0.3, boite.y + boite.height * y1);
    await page.mouse.click(boite.x + boite.width * 0.7, boite.y + boite.height * y2);
    await expect(page.getByTestId('plan-2d').getByText(/m²$/).first()).toBeVisible();
    await expect(
      page.getByRole('status').filter({ hasText: 'Gardé sur cet appareil' }),
    ).toBeAttached({
      timeout: 10_000,
    });
    // Le bandeau se réduit en pastille, toujours visible ; « Enregistrer » ouvre une fenêtre.
    await page.getByRole('button', { name: 'Réduire le bandeau d’essai' }).click();
    await expect(page.getByText('Essai sans compte')).toBeVisible();
    await page.getByRole('button', { name: 'Enregistrer une version' }).click();
    await expect(page.getByRole('dialog', { name: 'Enregistrez votre plan' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuer l’essai' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // Rechargé : l'essai est toujours là ; les fonctions serveur invitent au compte.
    await page.reload();
    await expect(page.getByTestId('plan-2d').getByText(/m²$/).first()).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Menus du plan' })
      .getByRole('button', { name: 'Chiffrer' })
      .click();
    await expect(
      page.getByText(/Créez votre compte gratuit pour télécharger le PDF/),
    ).toBeVisible();
    // Connexion : l'essai devient un plan du compte, ouvert dans l'éditeur.
    // La page de suite reprend l'essai puis ouvre aussitôt le plan : on attend l'éditeur.
    await connecter(
      page,
      COMPTES.proprio,
      '/mon-espace/plans?essai=1',
      'pro',
      /\/mes-plans\/[A-Za-z0-9]{20}$/,
    );
    await expect(page.getByTestId('plan-2d').getByText(/m²$/).first()).toBeVisible();
    await expect(page.getByText('Essai sans compte')).toHaveCount(0);
  });
});
