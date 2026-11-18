import { expect, test } from '@playwright/test';
import { COMPTES, connecter, flagGlobal } from './outils';

// docs/DESSIN.md §6 : DES-01, DES-06, DES-10, DES-11, DES-38, DES-39 (éditeur 2D, lot 15d).
/** PDF d'une page (un rectangle tracé), construit avec ses décalages exacts. */
function pdfMinimal(): Buffer {
  const flux = '20 20 500 300 re S';
  const objets = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 540 340] /Contents 4 0 R >>',
    `<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`,
  ];
  let corps = '%PDF-1.4\n';
  const decalages = objets.map((o, i) => {
    const d = corps.length;
    corps += `${i + 1} 0 obj\n${o}\nendobj\n`;
    return d;
  });
  const xref = corps.length;
  corps += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  for (const d of decalages) corps += `${String(d).padStart(10, '0')} 00000 n \n`;
  corps += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(corps, 'latin1');
}

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
    await page.getByLabel('Plan à importer').setInputFiles({
      name: 'plan.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    });
    await expect(svg.locator('image')).toHaveCount(1);
    await expect(page.getByText(/^Opacité/)).toBeVisible();
    // Un PDF remplace l'image : sa première page est convertie dans le navigateur.
    const avant = await svg.locator('image').getAttribute('href');
    await page.getByLabel('Remplacer le plan').setInputFiles({
      name: 'plan.pdf',
      mimeType: 'application/pdf',
      buffer: pdfMinimal(),
    });
    await expect(svg.locator('image')).not.toHaveAttribute('href', avant!, { timeout: 15_000 });
    await expect(page.getByText(/n’a pas pu être lu|n’est pas une image/)).toHaveCount(0);

    await expect(page.getByRole('status').filter({ hasText: 'Enregistré' })).toBeAttached({
      timeout: 10_000,
    });
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Niveau' }).locator('option')).toHaveCount(2);
    await expect(
      page.getByTestId('plan-2d').getByRole('button', { name: 'Porte d’entrée de 90 cm' }),
    ).toBeVisible();
  });
  test('meubler une chambre, poser du parquet, tracer une zone, retrouver le tout', async ({
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

    // Équiper (DES-21, DES-22) : un lit posé d'un clic, tourné avec la touche R.
    await menu('Équiper');
    await page
      .getByRole('button', { name: /^Chambre\b/ })
      .first()
      .click();
    await page.getByRole('button', { name: /^Lit 160 × 200/ }).click();
    await cliquer(5000, 4000);
    const lit = plan.getByRole('button', { name: 'Lit 160 × 200' });
    await expect(lit).toBeVisible();
    await expect(page.getByText('Pivoter · 0°')).toBeVisible();
    await page.keyboard.press('r');
    await expect(page.getByText('Pivoter · 90°')).toBeVisible();
    // Rotation libre sur les autres axes, au degré près.
    await page.getByLabel('Basculer sur le côté, en degrés').fill('30');
    await page.getByLabel('Basculer sur le côté, en degrés').press('Enter');
    await expect(page.getByText('Basculer sur le côté · 30°')).toBeVisible();

    // Finitions (DES-26) : parquet chêne clair sur le sol de la pièce. Sur téléphone, le
    // panneau des propriétés recouvre le plan : on le replie avant de cliquer.
    if (page.viewportSize()!.width < 900)
      await page.getByRole('button', { name: 'Replier propriétés' }).click();
    await cliquer(9000, 1500);
    await menu('Finitions');
    await page.getByRole('button', { name: 'Chêne clair', exact: true }).click();
    await expect(svg.locator('pattern')).not.toHaveCount(0);

    // Zone au sol (DES-27) : deux coins dans la pièce, carrelage par défaut.
    await page.getByRole('button', { name: 'Tracer une zone au sol' }).click();
    await cliquer(1000, 1000);
    await cliquer(3000, 2500);
    await expect(plan.getByRole('button', { name: 'Zone décorative' })).toBeVisible();

    await expect(page.getByRole('status').filter({ hasText: 'Enregistré' })).toBeAttached({
      timeout: 10_000,
    });
    await page.reload();
    await expect(
      page.getByTestId('plan-2d').getByRole('button', { name: 'Lit 160 × 200' }),
    ).toBeVisible();
    await expect(
      page.getByTestId('plan-2d').getByRole('button', { name: 'Zone décorative' }),
    ).toBeVisible();
  });
});
