import { test } from '@playwright/test';

// Captures des pages publiques à 1440 et 390 px, comparées aux maquettes (lot 6, /maquette).
// Lancement manuel : CAPTURES=1 pnpm e2e captures --project=ordinateur
const PAGES = (process.env.CAPTURES_PAGES ?? '/').split(',');
const DOSSIER = process.env.CAPTURES_DOSSIER ?? 'test-results/captures';

test.describe('captures', () => {
  test.skip(!process.env.CAPTURES, 'lancement manuel');
  for (const chemin of PAGES) {
    for (const largeur of [1440, 390]) {
      test(`${chemin} à ${largeur} px`, async ({ page }) => {
        await page.setViewportSize({ width: largeur, height: 900 });
        await page.goto(chemin);
        await page.evaluate(() => document.fonts.ready);
        const nom = chemin.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'accueil';
        await page.screenshot({ path: `${DOSSIER}/${nom}-${largeur}.png`, fullPage: true });
        await page.screenshot({ path: `${DOSSIER}/${nom}-${largeur}-haut.png` });
      });
    }
  }
});
