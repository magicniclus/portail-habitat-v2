import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const donnees = JSON.parse(
  readFileSync(new URL('../../../docs/data/communes.json', import.meta.url), 'utf8'),
) as {
  ordre: string[];
  communes: Record<string, { nom: string }>;
};
const COMMUNES = donnees.ordre.map((slug) => ({ slug, nom: donnees.communes[slug]!.nom }));

test.describe('Diagnostic immobilier', () => {
  test('DIA-05 : 11 pages communes, titre unique, liens vers les 10 autres', async ({ page }) => {
    const titres = new Set<string>();
    for (const c of COMMUNES) {
      const reponse = await page.goto(`/diagnostic-immobilier/${c.slug}`);
      expect(reponse?.status()).toBe(200);
      // Générée au build : Next la sert depuis le cache statique.
      expect(reponse?.headers()['x-nextjs-cache'] ?? 'HIT').not.toBe('MISS');
      await expect(page.getByRole('heading', { level: 1 })).toContainText(c.nom);
      titres.add(await page.title());
      const autres = page.locator('#communes a');
      await expect(autres).toHaveCount(10);
      for (const x of COMMUNES.filter((x) => x.slug !== c.slug)) {
        await expect(
          page.locator(`#communes a[href="/diagnostic-immobilier/${x.slug}"]`),
        ).toHaveCount(1);
      }
    }
    expect(titres.size).toBe(11);
  });

  test('commune inconnue : 404', async ({ page }) => {
    const r = await page.goto('/diagnostic-immobilier/bordeaux');
    expect(r?.status()).toBe(404);
  });

  test('le hero préremplit le parcours (DIA-01)', async ({ page }) => {
    await page.goto('/diagnostic-immobilier');
    await page.getByLabel('Je veux').selectOption('vente');
    await page.getByLabel('Un bien').selectOption('maison');
    await page.getByLabel('Construit').selectOption('1949-1976');
    await page.getByRole('button', { name: 'Voir mes diagnostics obligatoires' }).click();
    await expect(page).toHaveURL(
      /\/diagnostic-immobilier\/estimation\?motif=vente&type=maison&periode=1949-1976/,
    );
  });
});
