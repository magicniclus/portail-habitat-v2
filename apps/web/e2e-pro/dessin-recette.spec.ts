import { expect, test, type Page } from '@playwright/test';
import { activerPlans } from './dessinOutils';
import { COMPTES, connecter } from './outils';

test.beforeAll(activerPlans);

/** Dossier des captures de recette (lues à la main), facultatif. */
const CAPTURES = process.env.CAPTURES_RECETTE;
const capture = async (page: Page, nom: string) => {
  if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/${nom}.png` });
};

/** La 3D est vraiment dessinée : assez de couleurs différentes sur la toile (pas un fond uni). */
const couleursDe3D = (page: Page) =>
  page
    .getByTestId('vue-3d')
    .locator('canvas')
    .evaluate((c: HTMLCanvasElement) => {
      const t = document.createElement('canvas');
      [t.width, t.height] = [96, 64];
      const g = t.getContext('2d')!;
      g.drawImage(c, 0, 0, 96, 64);
      const d = g.getImageData(0, 0, 96, 64).data;
      const vues = new Set<number>();
      for (let i = 0; i < d.length; i += 4)
        vues.add((d[i]! >> 4) * 256 + (d[i + 1]! >> 4) * 16 + (d[i + 2]! >> 4));
      return vues.size;
    });

/**
 * Recette sur un vrai plan (DES-01 à DES-37) : la maison en L meublée de démonstration, deux
 * niveaux, escalier, toit, parcelle, terrasse, piscine. Navigation 2D, sélection de chaque sorte
 * d'élément, gestes, niveaux, 3D sous tous ses modes, visite, façades. Aucune erreur de script.
 */
test.describe('Plans — recette sur une maison complète', () => {
  test('maison en L meublée : 2D, sélection, gestes, niveaux, 3D, visite, façades', async ({
    page,
  }, info) => {
    test.setTimeout(180_000);
    const ordinateur = info.project.name === 'ordinateur';
    const p = ordinateur ? 'o' : 't';
    const erreurs: string[] = [];
    page.on('pageerror', (e) => erreurs.push(e.message));

    await connecter(page, COMPTES.proprio, '/pro/plans');
    await page
      .getByRole('button', { name: /Nouveau plan|Créer mon premier plan/ })
      .first()
      .click();
    await page.getByRole('radio', { name: /Maison en L meublée/ }).check();
    await page.getByRole('button', { name: 'Créer le plan' }).click();
    const plan = page.getByTestId('plan-2d');
    const svg = plan.locator('svg');
    await expect(plan.getByRole('button', { name: /^Pièce / })).toHaveCount(6);
    await capture(page, `${p}-01-plan`);

    const vue = async () => (await svg.getAttribute('viewBox'))!.split(' ').map(Number);
    const versMm = async (x: number, y: number) => {
      const b = (await svg.boundingBox())!;
      const [vx, vy, vl] = await vue();
      const k = vl! / b.width;
      return { x: vx! + (x - b.x) * k, y: vy! + (y - b.y) * k };
    };
    const annonce = page.getByTestId('annonce-selection');

    // Navigation : la molette garde le point sous la souris, la vue ne bouge plus ensuite.
    if (ordinateur) {
      const b = (await svg.boundingBox())!;
      const [sx, sy] = [b.x + b.width * 0.35, b.y + b.height * 0.4];
      const avant = await versMm(sx, sy);
      await page.mouse.move(sx, sy);
      for (const d of [-120, -120, -120, 120, -120, 120, 120]) {
        await page.mouse.wheel(0, d);
        await page.waitForTimeout(60);
      }
      await page.waitForTimeout(400);
      const apres = await versMm(sx, sy);
      expect(Math.hypot(apres.x - avant.x, apres.y - avant.y)).toBeLessThan(30);
      const pose = await vue();
      await page.waitForTimeout(400);
      expect(await vue()).toEqual(pose);
      // Bouton du milieu : la vue suit la souris, au pixel.
      await page.mouse.down({ button: 'middle' });
      await page.mouse.move(sx + 120, sy + 60, { steps: 6 });
      await page.mouse.up({ button: 'middle' });
      const glisse = await versMm(sx + 120, sy + 60);
      expect(Math.hypot(glisse.x - avant.x, glisse.y - avant.y)).toBeLessThan(30);
      await page.getByRole('button', { name: 'Ajuster à l’écran' }).click();
      await page.waitForTimeout(400);
    }

    // Sélection de chaque sorte d'élément, au clic (ou au toucher) sur son dessin.
    const choisir = async (element: ReturnType<typeof plan.getByRole>, attendu: RegExp) => {
      const b = (await element.boundingBox())!;
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await expect(annonce).toHaveText(attendu);
      if (
        !ordinateur &&
        (await page.getByRole('button', { name: 'Replier propriétés' }).isVisible())
      )
        await page.getByRole('button', { name: 'Replier propriétés' }).click();
      await page.waitForTimeout(300);
    };
    await choisir(plan.getByRole('button', { name: 'Canapé 3 places' }), /^Canapé 3 places choisi/);
    await choisir(plan.getByRole('button', { name: /^Piscine/ }), /^Piscine choisie/);
    await choisir(plan.getByRole('button', { name: /^Escalier / }), /^Escalier choisi/);
    await choisir(plan.getByRole('button', { name: 'Arbre' }).first(), /^Arbre/);
    await capture(page, `${p}-02-selection`);

    // Un meuble se déplace, puis on annule : il revient au même endroit.
    if (ordinateur) {
      const canape = plan.getByRole('button', { name: 'Canapé 3 places' });
      const b = (await canape.boundingBox())!;
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2 + 40, b.y + b.height / 2 + 25, { steps: 8 });
      await page.mouse.up();
      await expect
        .poll(async () => {
          const d = (await canape.boundingBox())!;
          return Math.abs(d.x - b.x) + Math.abs(d.y - b.y);
        })
        .toBeGreaterThan(10);
      await page.keyboard.press('Control+z');
      await expect
        .poll(async () => Math.round((await canape.boundingBox())!.x))
        .toBe(Math.round(b.x));
    }

    // Étage, puis retour au rez-de-chaussée.
    await page.locator('header select').first().selectOption({ index: 0 });
    await expect(plan.getByRole('button', { name: 'Pièce Salle d’eau' })).toBeAttached();
    await capture(page, `${p}-03-etage`);
    await page.locator('header select').first().selectOption({ label: 'Rez-de-chaussée' });
    await expect(plan.getByRole('button', { name: 'Pièce Séjour' })).toBeAttached();

    // 3D : dessinée dans chaque mode, sans erreur.
    const vue3d = page.getByRole('radio', { name: '3D' });
    const menu = async (nom: string) => {
      const b = page
        .getByRole('navigation', { name: 'Menus du plan' })
        .getByRole('button', { name: nom });
      if ((await b.getAttribute('aria-pressed')) !== 'true') await b.click();
    };
    if (await vue3d.isVisible()) await vue3d.click();
    else {
      await menu('Rendu');
      await page.getByRole('button', { name: 'Vue 3D' }).click();
    }
    await expect(page.getByTestId('vue-3d').locator('canvas')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(2500);
    expect(await couleursDe3D(page)).toBeGreaterThan(25);
    await capture(page, `${p}-04-3d-poupee`);
    await menu('Rendu');
    const modes: [string, string][] = [
      ['Maison de poupée (murs avant abaissés)', 'sans-poupee'],
      ['Murs transparents (voir au travers)', 'transparents'],
      ['Afficher seulement ce niveau', 'niveau-seul'],
    ];
    for (const [libelle, nom] of modes) {
      await page.getByLabel(libelle).click();
      await page.waitForTimeout(1200);
      expect(await couleursDe3D(page)).toBeGreaterThan(25);
      await capture(page, `${p}-05-3d-${nom}`);
    }
    // Maison entière fermée, toit compris : murs opaques même si « transparents » est coché.
    await page.locator('header select').first().selectOption('Extérieur · tout fermé');
    await page.waitForTimeout(1500);
    expect(await couleursDe3D(page)).toBeGreaterThan(25);
    await capture(page, `${p}-06-3d-exterieur`);
    await page.locator('header select').first().selectOption({ label: 'Rez-de-chaussée' });

    // Visite : on avance, à travers les murs, sans erreur.
    await menu('Rendu');
    await page.getByRole('button', { name: 'Visite', exact: true }).first().click();
    await page.waitForTimeout(2500);
    await capture(page, `${p}-07-visite`);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(1500);
    await page.keyboard.up('ArrowUp');
    await capture(page, `${p}-08-visite-avance`);

    // Façades : chaque face et la coupe.
    await menu('Rendu');
    await page.getByRole('button', { name: 'Façades et coupes' }).click();
    const facades = page.getByTestId('facades');
    for (const face of ['Nord', 'Est', 'Sud', 'Ouest']) {
      await facades.getByRole('radio', { name: face, exact: true }).click();
      await expect(
        facades.getByRole('img', { name: `Façade ${face.toLowerCase()}` }),
      ).toBeVisible();
      await capture(page, `${p}-09-facade-${face}`);
    }

    expect(erreurs).toEqual([]);
  });
});
