import { expect, test } from '@playwright/test';
import { activerPlans, PHOTO_TEST } from './dessinOutils';
import { COMPTES, connecter } from './outils';

test.beforeAll(activerPlans);

test.describe('Plans — extérieur, implantation, façades (DES-18 à DES-20, DES-35, DES-36)', () => {
  test('DES-18, DES-19, DES-20 : extérieur : parcelle, terrasse surélevée, piscine, arbre, clôture, métré et 3D', async ({
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
    const cliquer = async (xMm: number, yMm: number) => {
      const boite = (await svg.boundingBox())!;
      const [vx, vy, vl] = (await svg.getAttribute('viewBox'))!.split(' ').map(Number);
      const k = boite.width / vl!;
      await page.mouse.click(boite.x + (xMm - vx!) * k, boite.y + (yMm - vy!) * k);
    };
    const menu = async (nom: string) => {
      const b = page
        .getByRole('navigation', { name: 'Menus du plan' })
        .getByRole('button', { name: nom });
      if ((await b.getAttribute('aria-pressed')) !== 'true') await b.click();
    };
    const exterieur = async (outil: string) => {
      await menu('Structure');
      const sous = page.getByRole('button', { name: /^Terrasse, terrain, piscine/ });
      if (await sous.isVisible()) await sous.click();
      if (outil) await page.getByRole('button', { name: new RegExp(`^${outil}`) }).click();
      await page.waitForTimeout(400);
    };
    const replier = async () => {
      if (page.viewportSize()!.width < 900)
        await page.getByRole('button', { name: 'Replier propriétés' }).click();
      await page.waitForTimeout(300);
    };

    // DES-19 : parcelle autour de la maison.
    await exterieur('');
    await page.getByRole('button', { name: 'Parcelle autour de la maison' }).click();
    // La parcelle posée se montre entière (recadrage automatique).
    await page.waitForTimeout(400);
    // La parcelle se retouche après la pose : on la choisit par sa limite, on tire un coin.
    if (page.viewportSize()!.width >= 900) {
      await page
        .getByRole('toolbar', { name: 'Outils du plan' })
        .getByRole('button', { name: 'Sélectionner' })
        .click();
      await page.waitForTimeout(400);
      const limite = (await plan.getByTestId('limite-parcelle').boundingBox())!;
      await page.mouse.click(limite.x + 2, limite.y + limite.height / 2);
      const surface = page.getByRole('region', { name: 'Propriétés' }).getByText(/m²$/).first();
      await expect(surface).toBeVisible();
      const avant = await surface.textContent();
      const coin = (await plan.getByTestId('coin-parcelle-0').boundingBox())!;
      await page.mouse.move(coin.x + coin.width / 2, coin.y + coin.height / 2);
      await page.mouse.down();
      await page.mouse.move(coin.x - 30, coin.y - 30, { steps: 6 });
      await page.mouse.up();
      await expect(surface).not.toHaveText(avant!);
      // Le sol du terrain se revêt comme celui d'une pièce : gazon par défaut, puis pavés.
      await expect(plan.getByTestId('sol-terrain')).toBeAttached();
      await menu('Finitions');
      await page.getByLabel('Famille').selectOption('dalle');
      await page
        .getByRole('region', { name: 'Finitions' })
        .getByRole('button', { name: 'Pavés gris' })
        .click();
      await expect(plan.getByTestId('sol-terrain')).toHaveAttribute('fill', /^url\(#motif-/);
      await menu('Structure');
    }

    // DES-18 : terrasse à l'ouest (collée à la façade), surélevée de 60 cm avec garde-corps.
    await exterieur('Terrasse');
    await cliquer(-2_500, 1_000);
    await cliquer(-400, 4_000);
    await expect(plan.getByRole('button', { name: 'Terrasse' })).toBeVisible();
    await page.getByLabel('Hauteur au-dessus du sol (cm)').fill('60');
    await page.getByLabel('Hauteur au-dessus du sol (cm)').press('Enter');
    await page.getByLabel('Garde-corps').check();
    // Retouchée après la pose : un coin tiré, la surface change ; lames en travers.
    if (page.viewportSize()!.width >= 900) {
      const surface = page.getByRole('region', { name: 'Propriétés' }).getByText(/m²$/).first();
      const avant = await surface.textContent();
      const coin = (await plan.getByTestId('coin-terrasse-0').boundingBox())!;
      await page.mouse.move(coin.x + coin.width / 2, coin.y + coin.height / 2);
      await page.mouse.down();
      await page.mouse.move(coin.x - 25, coin.y - 25, { steps: 6 });
      await page.mouse.up();
      await expect(surface).not.toHaveText(avant!);
    }
    await page.getByLabel('Sens de pose').selectOption('900');
    await replier();

    // DES-20 : piscine tracée comme un sol (deux coins), volume d'eau calculé.
    await exterieur('Piscine');
    await cliquer(2_000, 9_500);
    await cliquer(10_000, 13_500);
    await expect(page.getByText('Volume d’eau')).toBeVisible();
    await expect(page.getByText(/^\d+,\d m³$/).first()).toBeVisible();
    await expect(page.getByText('Aux limites (indicatif)')).toBeVisible();
    // Terrasse autour de la piscine, jusqu'à la maison : la piscine y est encastrée.
    await page.getByRole('button', { name: 'Terrasse autour, jusqu’à la maison' }).click();
    await expect(plan.getByRole('button', { name: 'Terrasse' })).toHaveCount(2);
    await replier();

    // Arbre et clôture (deux points, Échap pour finir).
    await exterieur('Arbre');
    await cliquer(-2_000, -2_000);
    await replier();
    // Le dessin a grandi : on l'ajuste à l'écran, puis on dézoome pour voir jusqu'à la limite.
    await page.getByRole('button', { name: 'Ajuster à l’écran' }).click();
    await page.getByRole('button', { name: 'Dézoomer' }).click();
    await page.waitForTimeout(400);
    await exterieur('Clôture');
    await cliquer(-2_500, 16_000);
    await cliquer(12_500, 16_000);
    await page.keyboard.press('Escape');
    // Une clôture droite a une hauteur nulle à l'écran : on vérifie sa présence.
    await expect(plan.getByRole('button', { name: 'Clôture' })).toHaveCount(1);

    await menu('Chiffrer');
    await expect(page.getByText('Terrasse', { exact: true })).toBeVisible();
    await expect(page.getByText('Clôtures', { exact: true })).toBeVisible();

    await menu('Rendu');
    await page.getByLabel('Maison de poupée (murs avant abaissés)').uncheck();
    await page.getByRole('button', { name: 'Vue 3D' }).click();
    await expect(page.getByTestId('vue-3d').locator('canvas')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    await expect(page.getByRole('status').filter({ hasText: 'Enregistré' })).toBeAttached({
      timeout: 10_000,
    });
    await page.reload();
    await expect(
      page.getByTestId('plan-2d').getByRole('button', { name: 'Piscine' }),
    ).toBeVisible();
    await expect(page.getByTestId('plan-2d').getByRole('button', { name: 'Arbre' })).toBeVisible();
  });

  test('DES-35 : implantation : adresse, parcelle du cadastre, recalage, nord, distances aux limites', async ({
    page,
  }) => {
    // Services IGN simulés : on teste l'écran, pas les serveurs publics.
    await page.route('**/api/dessin/adresses', (r) =>
      r.fulfill({
        json: {
          ok: true,
          data: { adresses: [{ libelle: '1 Rue du Test 01000 Ville', lon: 3, lat: 46.5 }] },
        },
      }),
    );
    const L = (x: number, y: number) => ({ x: 700_000_000 + x, y: 6_600_000_000 + y });
    await page.route('**/api/dessin/parcelle', (r) =>
      r.fulfill({
        json: {
          ok: true,
          data: {
            reference: '01001000AB0012',
            codeInsee: '01001',
            contour: [L(0, 0), L(30_000, 0), L(30_000, 40_000), L(0, 40_000)],
            orthophoto: {
              storagePath: 'dessin/ortho-test.jpg',
              emprise: {
                x0: L(-25_000, 0).x,
                y0: L(0, -20_000).y,
                x1: L(55_000, 0).x,
                y1: L(0, 60_000).y,
              },
            },
          },
        },
      }),
    );
    // Photo aérienne simulée : une image de 2 × 2 px (lue par la route du plan).
    await page.route('**/api/dessin/lire-fond', (r) =>
      r.fulfill({ json: { ok: true, data: { url: PHOTO_TEST } } }),
    );
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
    await menu('Structure');
    await page.getByRole('button', { name: /^Implantation/ }).click();
    await page.getByLabel('Adresse du terrain').fill('1 rue du test');
    await page.getByRole('button', { name: 'Chercher la parcelle' }).click();
    await page.getByRole('button', { name: '1 Rue du Test 01000 Ville' }).click();
    await expect(page.getByText('01001000AB0012')).toBeVisible();
    await expect(plan.getByTestId('photo-aerienne')).toHaveCount(1);
    // Maison centrée sur une parcelle de 30 × 40 m : (30 − 10,6) / 2 = 9,70 m de chaque côté.
    const distances = page.getByTestId('distances-limites');
    await expect(distances).toContainText('9,70 m · 9,70 m');
    await expect(plan.getByTestId('cote-limite')).toHaveCount(4);
    await page.getByRole('button', { name: 'Parcelle vers la droite' }).click();
    await expect(distances).toContainText('9,20 m');
    await page.getByRole('button', { name: 'Pivoter de 5° à droite' }).click();
    await expect(page.getByText(/Nord à 5° du haut du plan/)).toBeVisible();
    await expect(plan.getByTestId('fleche-nord')).toHaveCount(1);

    await menu('Rendu');
    await page.getByRole('button', { name: 'Vue 3D' }).click();
    await expect(page.getByTestId('vue-3d').locator('canvas')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('status').filter({ hasText: 'Enregistré' })).toBeAttached({
      timeout: 10_000,
    });
    await page.reload();
    await expect(page.getByTestId('plan-2d').getByTestId('cote-limite')).toHaveCount(4);
    await expect(page.getByTestId('plan-2d').getByTestId('fleche-nord')).toHaveCount(1);
  });

  test('DES-36 : façades et coupe : élévations générées, toit, pignon, coupe tracée sur le plan', async ({
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
    await menu('Structure');
    await page.getByRole('button', { name: /^Toiture & combles/ }).click();
    await page.getByRole('button', { name: 'Deux pans' }).click();

    // DES-36 : façades nord / sud / est / ouest générées.
    await menu('Rendu');
    await page.getByRole('button', { name: 'Façades et coupes' }).click();
    const facades = page.getByTestId('facades');
    await expect(facades.getByRole('img', { name: 'Façade sud' })).toBeVisible();
    await expect(facades.locator('[data-genre="toit"]').first()).toBeAttached();
    await expect(facades.getByTestId('repere-altitude')).toHaveCount(3);
    await facades.getByRole('radio', { name: 'Est', exact: true }).click();
    await expect(facades.getByRole('img', { name: 'Façade est' })).toBeVisible();
    await expect(facades.locator('[data-genre="pignon"]').first()).toBeAttached();

    // Coupe : deux clics de part et d'autre de la maison, la coupe s'affiche.
    await facades.getByRole('button', { name: 'Tracer une coupe' }).click();
    await expect(page.getByText(/Coupe : cliquez deux points/)).toBeVisible();
    // Le panneau s'est ouvert : le plan se recadre en douceur avant qu'on clique dessus.
    await page.waitForTimeout(400);
    const svg = plan.locator('svg');
    const cliquer = async (xMm: number, yMm: number) => {
      const boite = (await svg.boundingBox())!;
      const [vx, vy, vl] = (await svg.getAttribute('viewBox'))!.split(' ').map(Number);
      const k = boite.width / vl!;
      await page.mouse.click(boite.x + (xMm - vx!) * k, boite.y + (yMm - vy!) * k);
    };
    await cliquer(-1_500, 4_300);
    await cliquer(12_000, 4_300);
    await expect(facades.getByRole('img', { name: 'Coupe' })).toBeVisible();
    expect(await facades.locator('[data-genre="coupe"]').count()).toBeGreaterThanOrEqual(3);
    await menu('Rendu');
    await page.getByRole('button', { name: 'Plan 2D' }).click();
    // Le trait de coupe ne reste pas sur le plan : la coupe se retrouve dans Façades.
    await expect(plan.locator('svg')).toBeVisible();
    await expect(plan.getByTestId('trait-coupe')).toHaveCount(0);
  });
});
