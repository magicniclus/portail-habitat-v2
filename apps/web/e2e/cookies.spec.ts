import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Bandeau cookies (INTEGRATIONS §7, CNIL)', () => {
  test('refuser est aussi simple qu’accepter ; le choix est mémorisé', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    const bandeau = page.getByRole('region', { name: 'Vos choix sur les cookies' });
    await expect(bandeau).toBeVisible();
    const refuser = bandeau.getByRole('button', { name: 'Tout refuser' });
    const accepter = bandeau.getByRole('button', { name: 'Tout accepter' });
    expect(await refuser.getAttribute('class')).toBe(await accepter.getAttribute('class'));
    await refuser.click();
    await expect(bandeau).toBeHidden();
    const c = (await context.cookies()).find((x) => x.name === 'ph_consentement');
    expect(decodeURIComponent(c!.value)).toMatch(/"a":0/);
    await page.reload();
    await expect(bandeau).toBeHidden();
  });

  test('personnaliser : audience détaillée décochée par défaut ; rouvrable depuis le pied de page', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Personnaliser' }).click();
    const feuille = page.getByRole('dialog', { name: 'Gérer les cookies' });
    const audience = feuille.getByRole('checkbox', { name: /Mesure d'audience détaillée/ });
    await expect(audience).not.toBeChecked();
    await audience.check();
    await feuille.getByRole('button', { name: 'Enregistrer mes choix' }).click();
    const c = (await context.cookies()).find((x) => x.name === 'ph_consentement');
    expect(decodeURIComponent(c!.value)).toMatch(/"a":1/);
    await page.getByRole('button', { name: 'Gérer les cookies' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Gérer les cookies' }).getByRole('checkbox'),
    ).toBeChecked();
  });
});
