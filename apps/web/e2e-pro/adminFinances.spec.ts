import { expect, test } from '@playwright/test';
import { audits, connecter } from './outils';

// docs/ADMIN.md §2.8 (lot 13e), sur émulateurs.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('finances : indicateurs, onglets, export CSV journalisé', async ({ page }) => {
  await connecter(page, 'finance@test.local', '/admin/finances', 'admin');
  const indicateurs = page.getByRole('list', { name: 'Indicateurs' });
  await expect(indicateurs).toContainText('MRR');
  await expect(indicateurs).toContainText('Abonnés Premium');
  await page.getByRole('link', { name: 'Codes promo' }).click();
  await expect(page.getByRole('list', { name: 'Codes promo' })).toBeVisible();
  const avant = await audits('adminExportFinances', 'finances/2026-09');
  const r = await page.request.get('/admin/finances/export?mois=2026-09');
  expect(r.status()).toBe(200);
  expect(r.headers()['content-type']).toContain('text/csv');
  expect(await r.text()).toContain('date;piece;client;ht;tva;ttc;moyen');
  expect(await audits('adminExportFinances', 'finances/2026-09')).toBe(avant + 1);
  await page.context().clearCookies();
  await connecter(page, 'moderateur@test.local', '/admin', 'admin');
  expect((await page.request.get('/admin/finances/export?mois=2026-09')).status()).toBe(403);
});
