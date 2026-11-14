import { expect, test } from '@playwright/test';
import { flagGlobal } from './outils';

// ERR-03 : l'interrupteur « maintenance » de l'admin (config/flags) coupe les pages publiques,
// jamais l'admin ni les API ; relu au plus toutes les 30 s (2 s sur émulateurs).
test.skip(({ isMobile }) => isMobile, 'Vérifié sur ordinateur');

test('maintenance activée depuis l’admin : pages publiques en 503, API servies', async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const remettre = await flagGlobal('maintenance', true);
  try {
    await expect
      .poll(async () => (await request.get('/aide')).status(), {
        timeout: 45_000,
        intervals: [2000],
      })
      .toBe(503);
    await page.goto('/aide');
    await expect(page.getByText('Le site est en maintenance')).toBeVisible();
    expect((await request.get('/api/health')).status()).toBe(200);
  } finally {
    await remettre();
  }
  await expect
    .poll(async () => (await request.get('/aide')).status(), { timeout: 15_000, intervals: [1000] })
    .toBe(200);
});
