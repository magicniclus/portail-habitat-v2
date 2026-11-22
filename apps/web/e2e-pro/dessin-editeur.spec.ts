import { expect, test } from '@playwright/test';
import { activerPlans, pdfMinimal } from './dessinOutils';
import { COMPTES, connecter } from './outils';

test.beforeAll(activerPlans);

test.describe('Plans — éditeur 2D (DES-01 à DES-15, DES-21 à DES-28, DES-38, DES-39)', () => {
  test('DES-01, DES-06, DES-10, DES-11, DES-38, DES-39 : créer un plan rectangulaire, tracer une cloison, annuler, modifier une cote, retrouver le plan', async ({
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

  test('DES-02 : le comptable n’a pas accès aux plans', async ({ page }) => {
    await connecter(page, COMPTES.compta, '/pro/compte');
    await page.goto('/pro/plans');
    await expect(page).not.toHaveURL(/\/pro\/plans$/);
  });

  test('DES-04, DES-05, DES-12, DES-13, DES-14, DES-15, D91 : poser une porte et un escalier, ajouter un étage avec ses murs, retrouver le tout', async ({
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
      // Sur téléphone, la feuille se replie et le plan se recadre : on attend la fin du recadrage.
      await page.waitForTimeout(400);
    };

    // Porte d'entrée sur le mur du bas (DES-13).
    await structure('Portes & fenêtres', 'Porte d’entrée');
    let p = await ecran(5000, 8500);
    await page.mouse.dblclick(p.x, p.y);
    await expect(plan.getByRole('button', { name: 'Porte d’entrée de 90 cm' })).toBeVisible();

    // DES-14 : porte tirée en deux clics, d'un bord à l'autre ; aperçu entre les deux clics.
    await structure('Portes & fenêtres', 'Porte 83');
    p = await ecran(1500, 8500);
    await page.mouse.click(p.x, p.y);
    p = await ecran(2300, 7900);
    await page.mouse.move(p.x, p.y);
    await expect(plan.getByTestId('pose-ouverture')).toBeAttached();
    await page.mouse.click(p.x, p.y);
    await expect(plan.getByRole('button', { name: 'Porte de 80 cm' })).toBeVisible();

    // Escalier tracé dans la pièce (DES-15) : départ, virage, arrivée ; 15 marches pour 2,70 m.
    await structure('Escaliers', 'À palier');
    for (const [x, y] of [
      [1_000, 1_000],
      [1_000, 3_500],
      [3_500, 3_500],
    ] as const) {
      p = await ecran(x, y);
      await page.mouse.click(p.x, p.y);
    }
    await page.keyboard.press('Escape');
    await expect(plan.getByRole('button', { name: 'Escalier de 15 marches' })).toBeVisible();
    // Choisi : les poignées de son tracé apparaissent (une par point).
    await expect(plan.getByTestId(/^point-escalier-/)).toHaveCount(3);
    // Dessous ouvert, en métal (DES-15) : réglé dans Propriétés.
    if (page.viewportSize()!.width >= 900) {
      const dessous = page.getByRole('radiogroup', { name: 'Dessous' });
      await dessous.getByRole('radio', { name: 'Ouvert' }).click();
      await page
        .getByRole('radiogroup', { name: 'Matériau' })
        .getByRole('radio', { name: /Métal/ })
        .click();
      await expect(dessous.getByRole('radio', { name: 'Ouvert' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      await expect(page.getByText(/15 marches de 18 cm/)).toBeVisible();
    }

    // Étage avec les murs extérieurs repris (DES-04, DES-05).
    await structure('Niveaux', '');
    await page.getByRole('button', { name: 'Ajouter un étage' }).click();
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
    // Deux niveaux, plus la vue « Extérieur · tout fermé ».
    await expect(page.getByRole('combobox', { name: 'Niveau' }).locator('option')).toHaveCount(3);
    await expect(
      page.getByTestId('plan-2d').getByRole('button', { name: 'Porte d’entrée de 90 cm' }),
    ).toBeVisible();
  });

  test('DES-21, DES-22, DES-26, DES-27, DES-28 : meubler une chambre, poser du parquet, tracer une zone, retrouver le tout', async ({
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
    // Avant le clic, le lit suit le pointeur en transparence.
    await page.waitForTimeout(400);
    {
      const boite = (await svg.boundingBox())!;
      const [vx, vy, vl] = (await svg.getAttribute('viewBox'))!.split(' ').map(Number);
      const k = boite.width / vl!;
      await page.mouse.move(boite.x + (5000 - vx!) * k, boite.y + (4000 - vy!) * k);
    }
    await expect(plan.getByTestId('pose-objet')).toBeAttached();
    await cliquer(5000, 4000);
    await expect(plan.getByTestId('pose-objet')).toHaveCount(0);
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
    if (page.viewportSize()!.width < 900) {
      await page.getByRole('button', { name: 'Replier propriétés' }).click();
      // La feuille se replie et le plan se recadre : on attend la fin du recadrage.
      await page.waitForTimeout(400);
    }
    await cliquer(9000, 1500);
    await menu('Finitions');
    await page.getByRole('button', { name: 'Chêne clair', exact: true }).click();
    await expect(svg.locator('pattern')).not.toHaveCount(0);

    // Zone au sol (DES-27) : deux coins dans la pièce, carrelage par défaut.
    await page.getByRole('button', { name: 'Tracer une zone au sol' }).click();
    // Sur téléphone, la feuille se replie et le plan se recadre : on attend la fin du recadrage.
    await page.waitForTimeout(400);
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
  test('DES-40 : nommer une version, la prévisualiser, la restaurer sans rien écraser', async ({
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
    const enregistre = page.getByRole('status').filter({ hasText: 'Enregistré' });
    await expect(enregistre).toBeAttached({ timeout: 10_000 });

    // Version nommée « Avant », puis le plan change (pièce renommée).
    await page.getByRole('button', { name: 'Historique des versions' }).click();
    const fenetre = page.getByRole('dialog', { name: 'Historique des versions' });
    await fenetre.getByLabel('Nommer la version actuelle').fill('Avant');
    await fenetre.getByRole('button', { name: 'Enregistrer cette version' }).click();
    await expect(fenetre.getByText('Avant', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await plan
      .getByRole('button', { name: /^Pièce / })
      .first()
      .click({ force: true });
    await page.getByLabel('Nom de la pièce').fill('Séjour');
    await page.getByLabel('Nom de la pièce').press('Tab');
    await expect(plan.getByText('Séjour')).toBeVisible();
    await expect(enregistre).toBeAttached({ timeout: 10_000 });

    // Aperçu en lecture seule, puis restauration : le nom d'avant revient.
    await page.getByRole('button', { name: 'Historique des versions' }).click();
    await fenetre
      .getByRole('listitem')
      .filter({ hasText: 'Avant' })
      .getByRole('button', { name: 'Aperçu' })
      .click();
    const apercu = page.getByTestId('apercu-version');
    await expect(apercu.getByText('Lecture seule')).toBeVisible();
    await expect(apercu.getByText('Séjour')).toHaveCount(0);
    await apercu.getByRole('button', { name: 'Restaurer cette version' }).click();
    await expect(apercu).toHaveCount(0);
    await expect(plan.getByText('Séjour')).toHaveCount(0);
    await expect(plan.getByText('83,6 m²')).toBeVisible();
  });
  test('DES-06, DES-07, DES-09, DES-11 : longueur au clavier, Maj, réglages et découpe du mur, type de pièce', async ({
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
    const ecran = async (x: number, y: number) => {
      const b = (await svg.boundingBox())!;
      const [vx, vy, vl] = (await svg.getAttribute('viewBox'))!.split(' ').map(Number);
      const k = b.width / vl!;
      return { x: b.x + (x - vx!) * k, y: b.y + (y - vy!) * k };
    };
    const menu = page
      .getByRole('navigation', { name: 'Menus du plan' })
      .getByRole('button', { name: 'Structure' });
    if ((await menu.getAttribute('aria-pressed')) !== 'true') await menu.click();
    await page.getByRole('button', { name: /^Murs & cloisons/ }).click();
    const outil = page.getByRole('button', { name: /^Cloison/ });
    await outil.click();
    // Outil sélectionné : bouton enfoncé, coché, sans libellé « Placer » (sur téléphone, la
    // feuille du menu se referme dès le choix).
    if (page.viewportSize()!.width >= 900) {
      await expect(outil).toHaveAttribute('aria-pressed', 'true');
      await expect(outil).toContainText('Sélectionné');
    }
    await page.waitForTimeout(400);

    // DES-06 : premier point, puis Maj (tracé droit) et longueur tapée au clavier.
    let p = await ecran(2000, 2000);
    await page.mouse.click(p.x, p.y);
    p = await ecran(5000, 2300);
    await page.keyboard.down('Shift');
    await page.mouse.move(p.x, p.y);
    await page.keyboard.up('Shift');
    await page.keyboard.press('3');
    await page.getByLabel('Longueur (cm)').fill('300');
    await page.getByLabel('Longueur (cm)').press('Enter');
    await page.keyboard.press('Escape');
    const cloison = plan.getByRole('button', { name: 'Cloison de 3,00 m' });
    await expect(cloison).toHaveCount(1);
    // Mur tiré jusqu'au bord : la vue avance pendant le tracé (plus de limite à 8 m).
    if (page.viewportSize()!.width >= 900) {
      const haut = async () => Number((await svg.getAttribute('viewBox'))!.split(' ')[1]);
      p = await ecran(8000, 2000);
      await page.mouse.click(p.x, p.y); // premier point d'un mur
      const avant = await haut();
      const boite = (await svg.boundingBox())!;
      await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height - 8, { steps: 5 });
      await expect.poll(haut).toBeGreaterThan(avant + 500);
      // Revenu dans la zone : la vue s'arrête.
      p = await ecran(8000, 3000);
      await page.mouse.move(p.x, p.y, { steps: 3 });
      await page.keyboard.press('Escape');
    }
    // DES-08 : à l'aplomb de l'extrémité de la cloison, le point s'aligne, guide affiché.
    p = await ecran(5020, 3500);
    await page.mouse.move(p.x, p.y);
    await expect(plan.getByTestId('accroche-alignement')).toBeAttached();

    // DES-07 et DES-09 : épaisseur, découpe en deux, fusion (outil Sélection).
    await page
      .getByRole('toolbar', { name: 'Outils du plan' })
      .getByRole('button', { name: 'Sélectionner' })
      .click();
    await cloison.click({ force: true });
    if (page.viewportSize()!.width < 900)
      await page
        .getByRole('button', { name: 'Propriétés' })
        .click()
        .catch(() => undefined);
    await page.getByLabel('Épaisseur (cm)').fill('10');
    await page.getByLabel('Épaisseur (cm)').press('Enter');
    await page.getByRole('button', { name: 'Couper en deux' }).click();
    await expect(plan.getByRole('button', { name: 'Cloison de 1,50 m' })).toHaveCount(2);
    await plan.getByRole('button', { name: 'Cloison de 1,50 m' }).first().click({ force: true });
    await page.getByRole('button', { name: 'Fusionner avec le voisin' }).click();
    await expect(plan.getByRole('button', { name: 'Cloison de 3,00 m' })).toHaveCount(1);

    // DES-11 : type de pièce ; une pièce sans nom choisi prend le nom de son type.
    await plan
      .getByRole('button', { name: /^Pièce / })
      .first()
      .click({ force: true });
    await page.getByLabel('Type de pièce').selectOption('cuisine');
    await expect(plan.getByText('Cuisine', { exact: true })).toBeVisible();
  });
});
