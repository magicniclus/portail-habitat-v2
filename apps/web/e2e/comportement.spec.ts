import { expect, test, type Page, type Request } from '@playwright/test';

/** Mesure du comportement (COMPORTEMENT §2 et §7) : consentement, un seul envoi, aucune valeur. */
test.use({ storageState: { cookies: [], origins: [] } });

/** Relève les envois vers /api/t (`sendBeacon` échappe à `route` : on écoute les requêtes). */
async function capter(page: Page) {
  const envois: Request[] = [];
  page.context().on('request', (r) => {
    if (new URL(r.url()).pathname === '/api/t') envois.push(r);
  });
  return envois;
}

const choisir = async (page: Page, choix: 'Tout accepter' | 'Tout refuser') => {
  await page
    .getByRole('region', { name: 'Vos choix sur les cookies' })
    .getByRole('button', { name: choix })
    .click();
};

test.describe('Mesure du comportement', () => {
  test('CMP-01 : sans consentement, aucune requête vers /api/t', async ({ page }) => {
    const envois = await capter(page);
    await page.goto('/pro');
    await page.getByRole('heading', { level: 1 }).click();
    await page.goto('/');
    await choisir(page, 'Tout refuser');
    await page.mouse.wheel(0, 800);
    await page.goto('/aide');
    await page.waitForTimeout(300);
    expect(envois).toHaveLength(0);
  });

  test('CMP-02 : une page vue = un envoi, sans aucune valeur de champ', async ({ page }) => {
    const envois = await capter(page);
    // Le corps d'un `sendBeacon` n'est pas lisible ici : on passe par le repli `fetch` keepalive.
    await page.addInitScript(() => {
      navigator.sendBeacon = () => false;
    });
    await page.goto('/pro');
    await choisir(page, 'Tout accepter');
    await page.getByLabel('Email', { exact: false }).first().fill('jean.dupont@exemple.fr');
    await page.getByRole('heading', { level: 1 }).click();
    const envoi = page.waitForRequest('**/api/t');
    await page.goto('/aide');
    await envoi;
    await page.waitForTimeout(300);
    expect(envois).toHaveLength(1);
    const corps = envois[0]!.postData() ?? '';
    expect(corps).not.toContain('jean.dupont');
    expect(JSON.parse(corps)).toMatchObject({ page: 'acquisition-artisans', app: 'pro', v: 1 });
  });

  test('« Ne plus mesurer ma visite » coupe la mesure', async ({ page }) => {
    const envois = await capter(page);
    await page.goto('/');
    await choisir(page, 'Tout accepter');
    await page.getByRole('button', { name: 'Ne plus mesurer ma visite' }).click();
    await expect(page.getByRole('status').filter({ hasText: /plus mesurée/ })).toBeVisible();
    await page.goto('/aide');
    await page.waitForTimeout(300);
    expect(envois).toHaveLength(0);
  });
});
