import {
  champsTropPetits,
  ciblesTropPetites,
  defileHorizontalement,
} from '@ph/config/playwright/mesures';
import { expect, test } from '@playwright/test';

// MOBILE.md §12, sur chaque projet (iPhone SE = 320 px de large).
const PAGES = [
  '/',
  '/page-inconnue',
  '/pro/page-inconnue',
  '/diagnostic-immobilier/page-inconnue',
  '/diagnostic-immobilier',
  '/diagnostic-immobilier/cenon',
  '/maintenance',
];

for (const chemin of PAGES) {
  test(`MOB-01 à 03 : ${chemin}`, async ({ page }) => {
    await page.goto(chemin);
    await page.evaluate(() => document.fonts.ready);
    expect(await defileHorizontalement(page), 'MOB-01 : défilement horizontal').toBe(false);
    expect(await ciblesTropPetites(page), 'MOB-02 : cibles < 44 px').toEqual([]);
    expect(await champsTropPetits(page), 'MOB-03 : champs < 16 px').toEqual([]);
  });
}
