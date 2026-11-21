import { expect, test } from '@playwright/test';
import { activerPlans } from './dessinOutils';
import { COMPTES, connecter } from './outils';

test.beforeAll(activerPlans);

test.describe('Plans — 3D, menuiseries, toiture (DES-13 à DES-17, DES-33, DES-34, DES-37)', () => {
  test('DES-33, DES-34, DES-37 : voir le plan en 3D : murs, meubles, soleil, maison de poupée, retour au plan', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await connecter(page, COMPTES.proprio, '/pro/plans');
    await page
      .getByRole('button', { name: /Nouveau plan|Créer mon premier plan/ })
      .first()
      .click();
    await page.getByLabel('Largeur hors tout (cm)').fill('1060');
    await page.getByLabel('Profondeur hors tout (cm)').fill('860');
    await page.getByRole('button', { name: 'Créer le plan' }).click();
    const plan = page.getByTestId('plan-2d');
    await expect(plan.getByText('83,6 m²')).toBeVisible();
    const menu = async (nom: string) => {
      const b = page
        .getByRole('navigation', { name: 'Menus du plan' })
        .getByRole('button', { name: nom });
      if ((await b.getAttribute('aria-pressed')) !== 'true') await b.click();
    };
    // Un lit pour avoir un meuble en 3D.
    await menu('Équiper');
    await page
      .getByRole('button', { name: /^Chambre\b/ })
      .first()
      .click();
    await page.getByRole('button', { name: /^Lit 160 × 200/ }).click();
    const svg = plan.locator('svg');
    const boite = (await svg.boundingBox())!;
    await page.mouse.click(boite.x + boite.width / 2, boite.y + boite.height / 2);
    await expect(plan.getByRole('button', { name: 'Lit 160 × 200' })).toBeVisible();

    // DES-33 : vue 3D depuis le menu Rendu (aussi sur téléphone), chargée à la demande.
    await menu('Rendu');
    await page.getByRole('button', { name: 'Vue 3D' }).click();
    const vue = page.getByTestId('vue-3d');
    await expect(vue.locator('canvas')).toBeVisible({ timeout: 20_000 });
    await expect(plan).toHaveCount(0);
    await page.waitForTimeout(1500);
    // Sur téléphone, le menu s'est replié pour montrer la 3D : on le rouvre.
    await menu('Rendu');
    await page.getByLabel(/^Soleil/).fill('9');
    await expect(page.getByText('Soleil · 9 h')).toBeVisible();
    await page.getByLabel('Maison de poupée (murs avant abaissés)').uncheck();
    await menu('Rendu');

    // DES-34 : visite à la première personne, on avance et le mini-plan suit.
    await page.getByRole('button', { name: 'Visite', exact: true }).first().click();
    const visite = page.getByTestId('visite');
    await expect(visite.locator('canvas')).toBeVisible({ timeout: 20_000 });
    const repere = page.getByRole('img', { name: 'Mini-plan : votre position' }).locator('polygon');
    await expect(page.getByRole('application', { name: /Joystick/ })).toBeVisible();
    const avant = await repere.getAttribute('points');
    await visite.click({ position: { x: 20, y: 20 } });
    await page.keyboard.down('z');
    await page.waitForTimeout(800);
    await page.keyboard.up('z');
    await expect(repere).not.toHaveAttribute('points', avant!);

    // DES-37 : vue photo, ambiance soirée, photo HD téléchargée et ajoutée à la galerie.
    await menu('Rendu');
    await page.getByRole('button', { name: 'Photo', exact: true }).click();
    await expect(page.getByTestId('photo').locator('canvas')).toBeVisible({ timeout: 20_000 });
    await page.getByLabel('Ambiance').selectOption('soiree');
    await page.waitForTimeout(1000);
    const telechargement = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Prendre la photo' }).click();
    expect((await telechargement).suggestedFilename()).toMatch(/^plan-photo-\d{12}\.jpg$/);
    await expect(page.getByText('Photo prête')).toBeVisible({ timeout: 20_000 });
    await menu('Rendu');
    await expect(page.getByRole('heading', { name: 'Mes photos (1)' })).toBeVisible();
    await expect(page.getByRole('img', { name: /^Photo du / })).toBeVisible();
    await page.getByRole('button', { name: /^Supprimer la photo/ }).click();
    await expect(page.getByRole('heading', { name: 'Mes photos (0)' })).toBeVisible();

    await page.getByRole('button', { name: 'Plan 2D' }).click();
    await expect(page.getByTestId('plan-2d')).toBeVisible();
  });

  test('DES-13, DES-14 menuiseries : menuiseries : galandage vitré à petits bois, fenêtre à volets, liste et rendu 3D', async ({
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
    const plan = page.getByTestId('plan-2d');
    await expect(plan.getByText('83,6 m²')).toBeVisible();
    const svg = plan.locator('svg');
    const ecran = async (xMm: number, yMm: number) => {
      const boite = (await svg.boundingBox())!;
      const [vx, vy, vl] = (await svg.getAttribute('viewBox'))!.split(' ').map(Number);
      const k = boite.width / vl!;
      return { x: boite.x + (xMm - vx!) * k, y: boite.y + (yMm - vy!) * k };
    };
    const menu = async (nom: string) => {
      const b = page
        .getByRole('navigation', { name: 'Menus du plan' })
        .getByRole('button', { name: nom });
      if ((await b.getAttribute('aria-pressed')) !== 'true') await b.click();
    };
    const ouverture = async (element: string) => {
      await menu('Structure');
      const retour = page
        .getByRole('region', { name: 'Structure' })
        .getByRole('button', { name: 'Structure', exact: true });
      if (await retour.isVisible()) await retour.click();
      await page.getByRole('button', { name: /^Portes & fenêtres/ }).click();
      await page.getByRole('button', { name: new RegExp(`^${element}`) }).click();
      // Le menu se replie sur téléphone : le plan se recadre avant qu'on clique dessus.
      await page.waitForTimeout(400);
    };
    const proprietes = async () => {
      if (!(await page.getByRole('region', { name: 'Propriétés' }).isVisible()))
        await page
          .getByRole('toolbar', { name: 'Outils du plan' })
          .getByRole('button', { name: 'Propriétés' })
          .click();
    };
    const replier = async () => {
      if (page.viewportSize()!.width < 900)
        await page.getByRole('button', { name: 'Replier propriétés' }).click();
    };

    // Porte à galandage dans le mur du haut : vitrée, 4 carreaux, gris anthracite.
    await ouverture('Porte à galandage(?! double)');
    let p = await ecran(4000, 100);
    // Deux clics au même endroit : taille du catalogue, centrée (DES-14).
    await page.mouse.dblclick(p.x, p.y);
    await expect(plan.getByRole('button', { name: /^Porte à galandage de/ })).toBeVisible();
    await proprietes();
    await page.getByLabel('Remplissage').selectOption('vitre');
    await page.getByLabel('Petits bois').selectOption('4');
    await page.getByRole('button', { name: 'Gris anthracite' }).click();
    await expect(page.getByLabel('Rangement de la porte')).toBeVisible();
    await replier();

    // Fenêtre 2 vantaux sur le mur du bas, avec volets battants.
    await ouverture('Fenêtre 2 vantaux');
    p = await ecran(6000, 8500);
    await page.mouse.dblclick(p.x, p.y);
    await proprietes();
    await page.getByLabel('Volets').selectOption('battant');
    await replier();

    await menu('Chiffrer');
    await expect(
      page.getByText(/^Porte à galandage 83 × 204 cm, vitré, 4 carreaux, PVC/),
    ).toBeVisible();
    await expect(
      page.getByText(/^Fenêtre 2 vantaux 120 × 125 cm, vitré, PVC, volet battant/),
    ).toBeVisible();

    await menu('Rendu');
    await page.getByRole('button', { name: 'Vue 3D' }).click();
    await expect(page.getByTestId('vue-3d').locator('canvas')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    await expect(page.getByRole('status').filter({ hasText: 'Enregistré' })).toBeAttached({
      timeout: 10_000,
    });
    await page.reload();
    await expect(
      page.getByTestId('plan-2d').getByRole('button', { name: /^Fenêtre 2 vantaux/ }),
    ).toBeVisible();
  });

  test('DES-33 édition en 3D : un clic sur le sol sélectionne la pièce, Finitions s’ouvre', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'ordinateur', 'Clic précis dans la scène 3D : ordinateur.');
    await connecter(page, COMPTES.proprio, '/pro/plans');
    await page
      .getByRole('button', { name: /Nouveau plan|Créer mon premier plan/ })
      .first()
      .click();
    await page.getByLabel('Largeur hors tout (cm)').fill('1060');
    await page.getByLabel('Profondeur hors tout (cm)').fill('860');
    await page.getByRole('button', { name: 'Créer le plan' }).click();
    await expect(page.getByTestId('plan-2d').getByText('83,6 m²')).toBeVisible();
    await page.getByRole('radio', { name: '3D' }).click();
    const canvas = page.getByTestId('vue-3d').locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(2500);
    const b = (await canvas.boundingBox())!;
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    const finitions = page.getByRole('region', { name: 'Finitions' });
    await expect(finitions).toBeVisible();
    await expect(finitions.getByRole('button', { name: 'Sol', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('DES-16, DES-17 : toiture deux pans : pente, fenêtre de toit, couverture au métré, toit en 3D', async ({
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
    const plan = page.getByTestId('plan-2d');
    await expect(plan.getByText('83,6 m²')).toBeVisible();
    const menu = async (nom: string) => {
      const b = page
        .getByRole('navigation', { name: 'Menus du plan' })
        .getByRole('button', { name: nom });
      if ((await b.getAttribute('aria-pressed')) !== 'true') await b.click();
    };

    // DES-16 : toit deux pans généré sur les murs, pente à 45°.
    await menu('Structure');
    await page.getByRole('button', { name: /^Toiture & combles/ }).click();
    await page.getByRole('button', { name: 'Deux pans' }).click();
    await expect(page.getByRole('term').filter({ hasText: 'Couverture' })).toBeVisible();
    await page.getByLabel(/^Pente/).fill('45');
    await expect(page.getByText('Pente · 45°')).toBeVisible();

    // Vue « Extérieur · tout fermé » : toiture vue de dessus, puis retour au plan.
    if (page.viewportSize()!.width >= 700) {
      await page.getByRole('combobox', { name: 'Niveau' }).selectOption('Extérieur · tout fermé');
      await expect(page.getByRole('img', { name: 'Maison fermée vue de dessus' })).toBeVisible();
      await page.getByRole('button', { name: 'Modifier le plan' }).click();
      await expect(plan).toBeVisible();
    }

    // DES-17 : fenêtre de toit posée d'un clic sur le plan.
    await page.getByRole('button', { name: 'Fenêtre de toit' }).click();
    await page.waitForTimeout(400);
    const svg = plan.locator('svg');
    const boite = (await svg.boundingBox())!;
    const [vx, vy, vl] = (await svg.getAttribute('viewBox'))!.split(' ').map(Number);
    const k = boite.width / vl!;
    await page.mouse.click(boite.x + (3000 - vx!) * k, boite.y + (3000 - vy!) * k);
    await menu('Structure');
    // Sur téléphone, le menu s'est replié pour la pose : on revient au sous-menu.
    const sousMenu = page.getByRole('button', { name: /^Toiture & combles/ });
    if (await sousMenu.isVisible()) await sousMenu.click();
    await expect(page.getByRole('button', { name: 'Retirer : Fenêtre de toit' })).toBeVisible();

    await menu('Chiffrer');
    await expect(page.getByText('Couverture de toiture')).toBeVisible();
    await expect(page.getByText('Fenêtres de toit')).toBeVisible();

    await menu('Rendu');
    await page.getByLabel('Maison de poupée (murs avant abaissés)').uncheck();
    await page.getByRole('button', { name: 'Vue 3D' }).click();
    await expect(page.getByTestId('vue-3d').locator('canvas')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    await expect(page.getByRole('status').filter({ hasText: 'Enregistré' })).toBeAttached({
      timeout: 10_000,
    });
  });

  test('DES-16 maison en L : maison en L : toit automatique en deux ailes, hauteurs au plus bas et au plus haut', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/plans');
    await page
      .getByRole('button', { name: /Nouveau plan|Créer mon premier plan/ })
      .first()
      .click();
    await page.getByRole('radio', { name: /En L/ }).check();
    await page.getByLabel('Largeur hors tout (cm)').fill('1060');
    await page.getByLabel('Profondeur hors tout (cm)').fill('860');
    await page.getByLabel('Découpe : largeur (cm)').fill('400');
    await page.getByLabel('Découpe : profondeur (cm)').fill('300');
    await page.getByRole('button', { name: 'Créer le plan' }).click();
    await expect(page.getByTestId('plan-2d')).toBeVisible();
    const menu = async (nom: string) => {
      const b = page
        .getByRole('navigation', { name: 'Menus du plan' })
        .getByRole('button', { name: nom });
      if ((await b.getAttribute('aria-pressed')) !== 'true') await b.click();
    };
    await menu('Structure');
    await page.getByRole('button', { name: /^Toiture & combles/ }).click();
    await page.getByRole('button', { name: 'Deux pans' }).click();
    // Égout à 3 m, faîtage à 7 m depuis le sol : la pente se calcule seule.
    await page.getByLabel('Au plus bas (m)').fill('3');
    await page.getByLabel('Au plus bas (m)').press('Enter');
    await expect(page.getByLabel('Au plus bas (m)')).toHaveValue('3,00');
    await page.getByLabel('Au plus haut (m)').fill('7');
    await page.getByLabel('Au plus haut (m)').press('Enter');
    await expect(page.getByLabel('Au plus haut (m)')).toHaveValue(/^(6,99|7,00|7,01)$/);
    await expect(page.getByText(/^Pente · (4[0-9]|5[0-9])°$/)).toBeVisible();

    await menu('Rendu');
    await page.getByLabel('Maison de poupée (murs avant abaissés)').uncheck();
    await page.getByRole('button', { name: 'Vue 3D' }).click();
    await expect(page.getByTestId('vue-3d').locator('canvas')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);
  });
});
