import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { activerPlans } from './dessinOutils';
import { COMPTES, connecter } from './outils';

/**
 * Captures réelles de Plans pour le curseur 2D / 3D des pages d'acquisition : la maison en L
 * meublée de démonstration, photographiée en 2D puis en 3D avec le même cadre.
 * Lancement manuel (émulateurs + jeu de test + build) :
 *   CAPTURES=1 pnpm --filter @ph/web exec playwright test -c playwright.pro.config.ts captures-plans --project ordinateur
 * Écrit apps/web/public/landing/captures/plans-{2d|3d}.webp et .avif.
 */
const SORTIE =
  process.env.CAPTURES_SORTIE ??
  fileURLToPath(new URL('../public/landing/captures', import.meta.url));
const TAILLE = { width: 1800, height: 1200 };

/** Masque les commandes posées sur le plan et la 3D : seule la maison reste à l'image. */
const SANS_INTERFACE = `
  header, nav, aside, [role="toolbar"], [role="radiogroup"], [data-testid="annonce-selection"],
  [data-testid="plan-2d"] > :not(svg), [data-testid="vue-3d"] ~ * { visibility: hidden !important; }
`;

async function enregistrer(image: Buffer, nom: string) {
  mkdirSync(SORTIE, { recursive: true });
  const f = join(SORTIE, nom);
  await sharp(image).resize(1200).webp({ quality: 84 }).toFile(`${f}.webp`);
  await sharp(image).resize(1200).avif({ quality: 60 }).toFile(`${f}.avif`);
  console.log(`✓ ${nom}`);
}

/** Boîte englobant toutes les pièces du plan 2D (la maison, sans le jardin). */
async function maison(page: Page) {
  const boites = await page
    .getByTestId('plan-2d')
    .getByRole('button', { name: /^Pièce / })
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect));
  const x = Math.min(...boites.map((r) => r.left));
  const y = Math.min(...boites.map((r) => r.top));
  const d = Math.max(...boites.map((r) => r.right));
  const bas = Math.max(...boites.map((r) => r.bottom));
  return { cx: (x + d) / 2, cy: (y + bas) / 2, l: d - x, h: bas - y };
}

type Boite = { x: number; y: number; width: number; height: number };

/** Cadre 4:3 centré sur un point, gardé dans la zone du plan (sans les panneaux). */
function cadre(cx: number, cy: number, largeur: number, zone: Boite) {
  const width = Math.round(Math.min(largeur, zone.width - 8, ((zone.height - 8) * 4) / 3));
  const height = Math.round((width * 3) / 4);
  const borne = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
  return {
    x: Math.round(borne(cx - width / 2, zone.x + 4, zone.x + zone.width - 4 - width)),
    y: Math.round(borne(cy - height / 2, zone.y + 4, zone.y + zone.height - 4 - height)),
    width,
    height,
  };
}

async function zoomer(page: Page, x: number, y: number, crans: number) {
  await page.mouse.move(x, y);
  for (let i = 0; i < crans; i++) {
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(120);
  }
}

test('captures Plans 2D et 3D', async ({ page }, info) => {
  test.skip(!process.env.CAPTURES, 'lancement manuel');
  test.skip(info.project.name !== 'ordinateur', 'ordinateur seulement');
  test.setTimeout(180_000);
  await activerPlans();
  await page.setViewportSize(TAILLE);
  await connecter(page, COMPTES.proprio, '/pro/plans');
  await page
    .getByRole('button', { name: /Nouveau plan|Créer mon premier plan/ })
    .first()
    .click();
  await page.getByRole('radio', { name: /Maison en L meublée/ }).check();
  await page.getByRole('button', { name: 'Créer le plan' }).click();
  await expect(page.getByTestId('plan-2d').getByRole('button', { name: /^Pièce / })).toHaveCount(6);
  let m = await maison(page);
  await zoomer(page, m.cx, m.cy, Number(process.env.CRANS_2D ?? 3));
  await page.waitForTimeout(600);
  m = await maison(page);
  console.log('maison 2D', JSON.stringify(m));
  await page.addStyleTag({ content: SANS_INTERFACE });
  await page.waitForTimeout(800);
  const zone = (await page.getByTestId('plan-2d').boundingBox())!;
  console.log('zone 2D', JSON.stringify(zone));
  const taille = Math.max(m.l, m.h * (4 / 3)) * 1.12;
  await enregistrer(await page.screenshot({ clip: cadre(m.cx, m.cy, taille, zone) }), 'plans-2d');

  await page.reload();
  await page.getByRole('radiogroup', { name: 'Vue' }).getByRole('radio', { name: '3D' }).click();
  const canvas = page.getByTestId('vue-3d').locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2500);
  const c = (await canvas.boundingBox())!;
  const [cx, cy] = [c.x + c.width / 2, c.y + c.height / 2];
  await zoomer(page, cx, cy, Number(process.env.CRANS_3D ?? 9));
  await page.addStyleTag({ content: SANS_INTERFACE });
  await page.waitForTimeout(3000);
  console.log('zone 3D', JSON.stringify(c));
  await enregistrer(await page.screenshot({ clip: cadre(cx, cy, taille, c) }), 'plans-3d');
});
