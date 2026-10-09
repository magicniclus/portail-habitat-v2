import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// ACCEPTANCE ALL-02, ALL-03, ALL-06 sur les pages publiques.
const PAGES = [
  '/',
  '/artisans',
  '/artisans/bertrand-renovation-bordeaux',
  '/simulateur',
  '/diagnostic-immobilier',
  '/diagnostic-immobilier/cenon',
  '/pro',
  '/aide',
  '/legal',
  '/connexion',
  '/avis',
];

for (const chemin of PAGES)
  test(`ALL-02 et ALL-03 : ${chemin}`, async ({ page }) => {
    const erreurs: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') erreurs.push(m.text());
    });
    page.on('pageerror', (e) => erreurs.push(e.message));
    page.on('response', (r) => {
      if (r.status() >= 400 && new URL(r.url()).origin === new URL(page.url() || r.url()).origin)
        erreurs.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(chemin);
    const axe = await new AxeBuilder({ page }).analyze();
    const graves = axe.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id} (${v.nodes.length})`);
    expect(graves).toEqual([]);
    // Clavier : le premier élément atteint a un indicateur de focus visible.
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return s.outlineStyle !== 'none' || s.boxShadow !== 'none';
    });
    expect(focus).toBe(true);
    expect(erreurs).toEqual([]);
  });

test('ALL-06 : titre et description uniques', async ({ page }) => {
  // Onze pages à la suite : plus que le délai par défaut d'un test.
  test.setTimeout(120_000);
  const titres = new Map<string, string>();
  const descriptions = new Map<string, string>();
  for (const chemin of PAGES) {
    await page.goto(chemin);
    const titre = await page.title();
    const description =
      (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(titres.get(titre), `titre en double : ${titre}`).toBeUndefined();
    titres.set(titre, chemin);
    if (!['/legal'].includes(chemin)) {
      expect(descriptions.get(description), `description en double sur ${chemin}`).toBeUndefined();
      descriptions.set(description, chemin);
    }
  }
});
