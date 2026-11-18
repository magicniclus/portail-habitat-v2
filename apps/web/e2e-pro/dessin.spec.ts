import { expect, test } from '@playwright/test';
import { COMPTES, connecter, flagGlobal } from './outils';

// docs/DESSIN.md §6 : DES-01, DES-06, DES-10, DES-11, DES-38, DES-39 (éditeur 2D, lot 15d).
let retablirFlag: () => Promise<void>;
test.beforeAll(async () => {
  retablirFlag = await flagGlobal('dessin', true);
});
test.afterAll(async () => {
  await retablirFlag();
});

test.describe('Plans (espace pro)', () => {
  test('créer un plan rectangulaire, tracer une cloison, annuler, modifier une cote, retrouver le plan', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/plans');
    await expect(page.getByRole('heading', { name: 'Mes plans', level: 1 })).toBeVisible();

    await page
      .getByRole('button', { name: /Nouveau plan|Créer mon premier plan/ })
      .first()
      .click();
    const titre = `Maison e2e ${Date.now()}`;
    await page.getByLabel('Nom du projet').fill(titre);
    await page.getByLabel('Largeur hors tout (cm)').fill('1060');
    await page.getByLabel('Profondeur hors tout (cm)').fill('860');
    await page.getByRole('button', { name: 'Créer le plan' }).click();

    // Éditeur plein écran, hors du cadre de l'espace pro.
    await expect(page).toHaveURL(/\/pro\/plans\/editeur\/[A-Za-z0-9]{20}$/);
    await expect(page.getByRole('navigation', { name: 'Menus du plan' })).toBeVisible();
    const plan = page.getByTestId('plan-2d');
    // 10,60 × 8,60 m hors tout, murs de 20 cm : 10,20 × 8,20 m = 83,6 m².
    await expect(plan.getByText('83,6 m²')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Enregistré' })).toBeAttached();

    // Cloison d'un mur à l'autre (DES-06) : deux pièces.
    await page.getByRole('button', { name: 'Tracer un mur' }).click();
    const svg = plan.locator('svg');
    const boite = (await svg.boundingBox())!;
    // Plan ajusté à l'écran : millimètres → pixels d'après la viewBox du SVG.
    const [vx, vy, vl] = (await svg.getAttribute('viewBox'))!.split(' ').map(Number);
    const echelle = boite.width / vl!;
    const ecran = (xMm: number, yMm: number) => ({
      x: boite.x + (xMm - vx!) * echelle,
      y: boite.y + (yMm - vy!) * echelle,
    });
    const a = ecran(100, 4000);
    const b = ecran(10_500, 4000);
    await page.mouse.click(a.x, a.y);
    await page.mouse.click(b.x, b.y);
    await page.keyboard.press('Escape');
    const pieces = plan.getByRole('button', { name: /^Pièce / });
    await expect(pieces).toHaveCount(2);

    // Annuler (DES-38) : une seule pièce.
    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(pieces).toHaveCount(1);

    // Cote modifiée dans l'inspecteur (DES-10) : la pièce se met à jour.
    await page.getByRole('button', { name: 'Sélectionner' }).click();
    await plan
      .getByRole('button', { name: /^Mur de 10,40 m/ })
      .first()
      .click();
    const longueur = page.getByLabel('Longueur (cm)');
    await longueur.fill('840');
    await longueur.press('Enter');
    await expect(plan.getByText('67,2 m²')).toBeVisible();

    // Enregistré automatiquement (DES-39) : retrouvé après rechargement.
    await expect(page.getByRole('status').filter({ hasText: 'Enregistré' })).toBeAttached({
      timeout: 10_000,
    });
    await page.reload();
    await expect(page.getByTestId('plan-2d').getByText('67,2 m²')).toBeVisible();
    await page.getByRole('link', { name: 'Mes plans' }).click();
    await expect(page).toHaveURL(/\/pro\/plans$/);
    await expect(page.getByRole('link', { name: new RegExp(titre) })).toBeVisible();
  });

  test('le comptable n’a pas accès aux plans', async ({ page }) => {
    await connecter(page, COMPTES.compta, '/pro/compte');
    await page.goto('/pro/plans');
    await expect(page).not.toHaveURL(/\/pro\/plans$/);
  });

  test('poser une porte et un escalier, ajouter un étage avec ses murs, retrouver le tout', async ({
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
    const structure = async (sous: string, element: string) => {
      const menu = page
        .getByRole('navigation', { name: 'Menus du plan' })
        .getByRole('button', { name: 'Structure' });
      if ((await menu.getAttribute('aria-pressed')) !== 'true') await menu.click();
      const retour = page
        .getByRole('region', { name: 'Structure' })
        .getByRole('button', { name: 'Structure', exact: true });
      if (await retour.isVisible()) await retour.click();
      await page.getByRole('button', { name: new RegExp(`^${sous}`) }).click();
      if (element) await page.getByRole('button', { name: new RegExp(`^${element}`) }).click();
    };

    // Porte d'entrée sur le mur du bas (DES-13).
    await structure('Portes & fenêtres', 'Porte d’entrée');
    let p = await ecran(5000, 8500);
    await page.mouse.click(p.x, p.y);
    await expect(plan.getByRole('button', { name: 'Porte d’entrée de 90 cm' })).toBeVisible();

    // Escalier droit dans la pièce (DES-15) : 15 marches pour 2,70 m.
    await structure('Escaliers', 'Escalier droit');
    p = await ecran(1000, 1000);
    await page.mouse.click(p.x, p.y);
    await expect(plan.getByRole('button', { name: 'Escalier de 15 marches' })).toBeVisible();

    // Étage avec les murs extérieurs repris (DES-04, DES-05).
    await structure('Niveaux', '');
    await page.getByRole('button', { name: '+ Étage' }).click();
    await expect(page.getByLabel('Nom du niveau Étage 1')).toBeVisible();
    await expect(plan.getByRole('button', { name: /^Pièce / })).toHaveCount(1);
    await expect(plan.getByRole('button', { name: /^Escalier/ })).toHaveCount(0);

    // Plan importé en calque (D91) : image envoyée, affichée sous le dessin.
    await structure('Importer un plan', '');
    await page.getByLabel('Image du plan').setInputFiles({
      name: 'plan.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    });
    await expect(svg.locator('image')).toHaveCount(1);
    await expect(page.getByText(/^Opacité/)).toBeVisible();

    await expect(page.getByRole('status').filter({ hasText: 'Enregistré' })).toBeAttached({
      timeout: 10_000,
    });
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Niveau' }).locator('option')).toHaveCount(2);
    await expect(
      page.getByTestId('plan-2d').getByRole('button', { name: 'Porte d’entrée de 90 cm' }),
    ).toBeVisible();
  });
});
