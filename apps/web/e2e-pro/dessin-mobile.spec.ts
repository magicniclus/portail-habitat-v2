import { expect, test } from '@playwright/test';
import { CATALOGUE_OBJETS, nouvelleScene } from '@ph/core/dessin';
import { activerPlans } from './dessinOutils';
import { COMPTES, connecter } from './outils';

test.beforeAll(activerPlans);

test.describe('Plans — téléphone, accessibilité, performance (DES-46 à DES-48)', () => {
  test('DES-46 téléphone : feuille du bas, pincer pour zoomer, appui long = propriétés', async ({
    page,
  }) => {
    test.skip(page.viewportSize()!.width >= 900, 'gestes du téléphone');
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
    // Feuille du bas : collée au bas de l'écran, le haut du plan reste visible.
    await page
      .getByRole('navigation', { name: 'Menus du plan' })
      .getByRole('button', { name: 'Chiffrer' })
      .click();
    const feuille = page.getByRole('region', { name: 'Chiffrer' });
    const b = (await feuille.boundingBox())!;
    const hauteur = page.viewportSize()!.height;
    expect(Math.round(b.y + b.height)).toBeGreaterThanOrEqual(hauteur - 2);
    expect(b.y).toBeGreaterThan(hauteur * 0.3);
    await page.getByRole('button', { name: 'Replier chiffrer' }).click();

    // Pincer : deux doigts qui s'écartent agrandissent le plan.
    const zoom = page.getByRole('toolbar', { name: 'Outils du plan' }).locator('[aria-live]');
    const avant = Number.parseInt((await zoom.textContent())!, 10);
    await plan.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const [cx, cy] = [r.x + r.width / 2, r.y + r.height / 2];
      const ev = (type: string, id: number, x: number) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            pointerId: id,
            pointerType: 'touch',
            clientX: x,
            clientY: cy,
            bubbles: true,
          }),
        );
      ev('pointerdown', 1, cx - 40);
      ev('pointerdown', 2, cx + 40);
      ev('pointermove', 1, cx - 80);
      ev('pointermove', 2, cx + 80);
      ev('pointerup', 1, cx - 80);
      ev('pointerup', 2, cx + 80);
    });
    await expect
      .poll(async () => Number.parseInt((await zoom.textContent())!, 10))
      .toBeGreaterThan(avant * 1.5);

    // Appui long sur la pièce : elle est choisie et ses propriétés s'ouvrent.
    await page.getByRole('button', { name: 'Ajuster à l’écran' }).click();
    // La pièce elle-même (son polygone), quel que soit le cadrage.
    await plan
      .getByRole('button', { name: /^Pièce / })
      .first()
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        el.dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerId: 7,
            pointerType: 'touch',
            clientX: r.x + r.width / 2,
            clientY: r.y + r.height / 2,
            bubbles: true,
          }),
        );
      });
    await expect(page.getByTestId('annonce-selection')).toHaveText(/^Pièce choisie/);
    await page.waitForTimeout(800);
    await plan.evaluate((el) =>
      el.dispatchEvent(
        new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', bubbles: true }),
      ),
    );
    await expect(page.getByRole('region', { name: 'Propriétés' })).toBeVisible();
  });

  test('DES-47 accessibilité : raccourcis sur « ? », élément choisi annoncé, animations réduites', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
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
    await page.keyboard.press('?');
    const fenetre = page.getByRole('dialog', { name: 'Raccourcis clavier' });
    await expect(fenetre).toBeVisible();
    await expect(fenetre.getByText('Déplacer la sélection de 1 cm')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(fenetre).toHaveCount(0);
    // Raccourcis d'outils : M pour le mur, V pour revenir à la sélection ; la liste s'ouvre aussi
    // depuis le bouton du rail de droite.
    const outils = page.getByRole('toolbar', { name: 'Outils du plan' });
    await page.keyboard.press('m');
    await expect(outils.getByRole('button', { name: 'Tracer un mur' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.keyboard.press('v');
    await expect(outils.getByRole('button', { name: 'Sélectionner' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await outils.getByRole('button', { name: 'Raccourcis clavier' }).click();
    await expect(fenetre.getByText('Tracer un mur')).toBeVisible();
    await page.keyboard.press('Escape');
    // Choisir la pièce : son nom et sa surface sont annoncés.
    await page.getByRole('button', { name: 'Ajuster à l’écran' }).click();
    const p = (await plan.getByText('83,6 m²').boundingBox())!;
    await page.mouse.click(p.x + p.width / 2, p.y + 40);
    await expect(page.getByTestId('annonce-selection')).toHaveText(
      // Sur un petit écran, le clic peut tomber sur le mur : nature et mesures annoncées aussi.
      /^(Pièce choisie : .+, 83,6 m²|Mur choisi : [\d,]+ m, épaisseur \d+ cm, hauteur 2,50 m)\.$/,
    );
    await expect(page.getByTestId('annonce-selection')).toHaveAttribute('aria-live', 'polite');
  });

  test('DES-48 performance : 500 murs et 1 000 objets, ouverture < 2 s, zoom fluide', async ({
    page,
  }) => {
    test.skip(page.viewportSize()!.width < 900, 'mesuré sur ordinateur');
    test.setTimeout(90_000);
    // Scène de charge : 125 pièces de 4 × 4 m (500 murs), 8 meubles par pièce (1 000 objets).
    let k = 0;
    const id = (p: string) => `${p}_charge${String(k++).padStart(6, '0')}`;
    const base = nouvelleScene(id);
    const murs: object[] = [];
    const objets: object[] = [];
    for (let c = 0; c < 25; c++)
      for (let r = 0; r < 5; r++) {
        const [x, y] = [c * 4_000, r * 4_000];
        const coins = [
          { x, y },
          { x: x + 4_000, y },
          { x: x + 4_000, y: y + 4_000 },
          { x, y: y + 4_000 },
        ];
        coins.forEach((a, i) =>
          murs.push({
            id: id('m'),
            a,
            b: coins[(i + 1) % 4],
            epaisseur: 200,
            hauteur: 2_500,
            type: 'mur',
          }),
        );
        for (let i = 0; i < 8; i++)
          objets.push({
            id: id('obj'),
            catalogueId: CATALOGUE_OBJETS[0]!.id,
            position: { x: x + 800 + (i % 4) * 800, y: y + 1_000 + Math.floor(i / 4) * 2_000 },
            dimensions: { l: 400, p: 400, h: 800 },
          });
      }
    const scene = { ...base, niveaux: [{ ...base.niveaux[0]!, murs, objets }] };
    await connecter(page, COMPTES.proprio, '/pro/plans');
    const cree = await page.evaluate(
      async (corps) => {
        const r = await fetch('/api/dessin/creer', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(corps),
        });
        return (await r.json()) as { ok: boolean; data?: { planId: string }; message?: string };
      },
      {
        espace: 'entreprise',
        titre: 'Plan de charge',
        scene,
        cleIdempotence: `charge-${Date.now()}`,
      },
    );
    expect(cree.ok, cree.message).toBe(true);
    // PDF d'une grande scène : le corps (bien plus de 16 Ko) est accepté ; 100 m de long ne
    // tiennent pas en A3 au 1/100, refus clair (et non 413).
    const pdf = await page.evaluate(
      async (corps) => {
        const r = await fetch('/api/dessin/pdf', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(corps),
        });
        return {
          statut: r.status,
          corps: (await r.json().catch(() => null)) as { message?: string } | null,
        };
      },
      {
        espace: 'entreprise',
        planId: cree.data!.planId,
        niveauId: base.niveaux[0]!.id,
        echelle: 100,
        format: 'A3',
        exclus: [],
        scene,
      },
    );
    expect(pdf.statut).not.toBe(413);
    expect(pdf.corps?.message).toMatch(/ne tient pas en A3/);

    // Ouverture d'un plan (hors 3D) : moins de 2 s jusqu'aux 500 murs dessinés.
    const t0 = Date.now();
    await page.goto(`/pro/plans/editeur/${cree.data!.planId}`);
    const plan = page.getByTestId('plan-2d');
    await expect(plan.getByRole('button', { name: /^Mur de / })).toHaveCount(500, {
      timeout: 10_000,
    });
    const ouverture = Date.now() - t0;
    console.log(`DES-48 ouverture : ${ouverture} ms`);
    expect(ouverture).toBeLessThan(2_000);

    // Zoom : chaque nouveau rendu du plan tient dans quelques images.
    const zoomer = page.getByRole('button', { name: 'Zoomer', exact: true });
    const t1 = Date.now();
    for (let i = 0; i < 5; i++) {
      await zoomer.click();
      await page.evaluate(
        () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))),
      );
    }
    const parZoom = (Date.now() - t1) / 5;
    console.log(`DES-48 zoom : ${Math.round(parZoom)} ms par rendu`);
    expect(parZoom).toBeLessThan(250);

    // Glisser un meuble : le geste le plus exigeant (un rendu du plan par mouvement).
    await page.getByRole('button', { name: 'Ajuster à l’écran' }).click();
    const svg = plan.locator('svg');
    const ecran = async (x: number, y: number) => {
      const b = (await svg.boundingBox())!;
      const [vx, vy, vl] = (await svg.getAttribute('viewBox'))!.split(' ').map(Number);
      const k = b.width / vl!;
      return { x: b.x + (x - vx!) * k, y: b.y + (y - vy!) * k };
    };
    const depart = await ecran(800, 1_000);
    await page.mouse.click(depart.x, depart.y);
    await page.mouse.down();
    const t2 = Date.now();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(depart.x + i * 2, depart.y);
      await page.evaluate(() => new Promise((ok) => requestAnimationFrame(ok)));
    }
    await page.mouse.up();
    const parMouvement = (Date.now() - t2) / 10;
    console.log(`DES-48 glisser : ${Math.round(parMouvement)} ms par mouvement`);
    expect(parMouvement).toBeLessThan(80);
  });
});
