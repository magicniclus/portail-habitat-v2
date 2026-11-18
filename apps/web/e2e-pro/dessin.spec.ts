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

/** PNG 2 × 2 (vert / gris) qui tient lieu de photo aérienne. */
const PHOTO_TEST =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAE0lEQVR4nGOI6nFbsGAaAxADWQAqZgYFdPEiigAAAABJRU5ErkJggg==';

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

  test('voir le plan en 3D : murs, meubles, soleil, maison de poupée, retour au plan', async ({
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

  test('menuiseries : galandage vitré à petits bois, fenêtre à volets, liste et rendu 3D', async ({
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
    await page.mouse.click(p.x, p.y);
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
    await page.mouse.click(p.x, p.y);
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

  test('toiture deux pans : pente, fenêtre de toit, couverture au métré, toit en 3D', async ({
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

  test('maison en L : toit automatique en deux ailes, hauteurs au plus bas et au plus haut', async ({
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

  test('extérieur : parcelle, terrasse surélevée, piscine, arbre, clôture, métré et 3D', async ({
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
    // Le cadre englobe maintenant la parcelle : on l'ajuste à l'écran.
    await page.getByRole('button', { name: 'Ajuster à l’écran' }).click();

    // DES-18 : terrasse à l'ouest (collée à la façade), surélevée de 60 cm avec garde-corps.
    await exterieur('Terrasse');
    await cliquer(-2_500, 1_000);
    await cliquer(-400, 4_000);
    await expect(plan.getByRole('button', { name: 'Terrasse' })).toBeVisible();
    await page.getByLabel('Hauteur au-dessus du sol (cm)').fill('60');
    await page.getByLabel('Hauteur au-dessus du sol (cm)').press('Enter');
    await page.getByLabel('Garde-corps').check();
    await replier();

    // DES-20 : piscine d'un clic, volume d'eau calculé.
    await exterieur('Piscine');
    await cliquer(6_000, 11_000);
    await expect(page.getByText('Volume d’eau')).toBeVisible();
    await expect(page.getByText('46,4 m³')).toBeVisible();
    await expect(page.getByText('Aux limites (indicatif)')).toBeVisible();
    // Terrasse autour de la piscine, jusqu'à la maison : la piscine y est encastrée.
    await page.getByRole('button', { name: 'Terrasse autour, jusqu’à la maison' }).click();
    await expect(plan.getByRole('button', { name: 'Terrasse' })).toHaveCount(2);
    await replier();

    // Arbre et clôture (deux points, Échap pour finir).
    await exterieur('Arbre');
    await cliquer(-2_000, -2_000);
    await replier();
    // Le dessin a grandi : on l'ajuste à l'écran avant de tracer la clôture.
    await page.getByRole('button', { name: 'Ajuster à l’écran' }).click();
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
  test('implantation : adresse, parcelle du cadastre, recalage, nord, distances aux limites', async ({
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
  test('façades et coupe : élévations générées, toit, pignon, coupe tracée sur le plan', async ({
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
    await expect(plan.getByTestId('trait-coupe')).toBeAttached();
  });
});
