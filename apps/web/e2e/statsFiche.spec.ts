import { expect, test } from '@playwright/test';

// Statistiques des fiches (DATABASE §5, statsJour) : une vue par onglet, le clic « Demander un devis ».
test('la fiche signale sa vue une fois par onglet, puis le clic sur « Demander un devis »', async ({
  page,
}) => {
  const envois: string[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/api/fiche/evenement')) envois.push(r.method());
  });
  await page.goto('/artisans/bertrand-renovation-bordeaux');
  await expect.poll(() => envois.length).toBe(1);
  await page.reload();
  await page.waitForTimeout(1000);
  expect(envois).toHaveLength(1);
  await page.getByRole('link', { name: 'Demander un devis' }).first().click();
  await expect.poll(() => envois.length).toBe(2);
});
