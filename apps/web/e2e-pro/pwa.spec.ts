import { expect, test } from '@playwright/test';
import { COMPTES, connecter } from './outils';

// MOB-06 (MOBILE §9) : l'espace pro s'installe comme application. La réception d'une notification
// push demande FCM (flag `notificationsPush` et clé VAPID) : vérifiée sur le projet de recette.

test.describe('Application pro (MOB-06)', () => {
  test('manifest installable et icônes', async ({ page, request }) => {
    const m = await (await request.get('/pro/manifest.webmanifest')).json();
    expect(m).toMatchObject({
      name: 'Portail Habitat Pro',
      display: 'standalone',
      scope: '/pro/',
      start_url: '/pro/tableau-de-bord',
    });
    for (const icone of m.icons as { src: string; sizes: string }[]) {
      const r = await request.get(icone.src);
      expect(r.status(), icone.src).toBe(200);
      expect(r.headers()['content-type']).toBe('image/png');
    }
    expect(m.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
    await page.goto('/pro/hors-ligne');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/pro/manifest.webmanifest',
    );
    await expect(
      page.getByRole('heading', { level: 1, name: 'Vous êtes hors ligne' }),
    ).toBeVisible();
  });

  test('service worker actif sur l’espace pro (hors ligne : test unitaire du worker)', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'ordinateur', 'Service worker vérifié sous Chromium');
    await connecter(page, COMPTES.proprio);
    // Après la connexion, le document est encore /connexion (hors portée) : page de l'espace chargée.
    await page.goto('/pro/tableau-de-bord');
    const portee = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(portee).toMatch(/\/pro\/$/);
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    await expect(page.getByRole('heading', { level: 1, name: /^Bonjour / })).toBeVisible();
  });

  test('invitation à installer dès la 2e visite, « Plus tard » retenu', async ({ page }, info) => {
    test.skip(info.project.name !== 'iphone-13', 'Guide Safari iOS');
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('init')) {
        sessionStorage.setItem('init', '1');
        localStorage.setItem('ph-pro-visites', '1');
      }
    });
    await connecter(page, COMPTES.proprio);
    const invitation = page.getByText("Installez l'application Portail Habitat Pro");
    await expect(invitation).toBeVisible();
    await expect(page.getByText(/touchez Partager puis « Sur l’écran d’accueil »/)).toBeVisible();
    await page.getByRole('button', { name: 'Plus tard' }).click();
    await expect(invitation).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: /^Bonjour / })).toBeVisible();
    await expect(invitation).toHaveCount(0);
  });
});
