import { expect, test, type Page } from '@playwright/test';

// Conversion des pages d'entrée artisans (décision du 17/11/2026, ACQUISITION ACQ-06 à ACQ-09) :
// formulaire au premier écran sur téléphone, trois champs, barre « Voir les demandes près de
// chez moi » quand le formulaire est sorti de l'écran.
const PAGES = [
  { url: '/pro', bouton: 'Voir les demandes de ma zone' },
  { url: '/pro/trouver-des-chantiers', bouton: 'Voir les demandes près de chez moi' },
  { url: '/pro/site-internet-artisan', bouton: /./ },
  { url: '/pro/logiciel-devis-factures', bouton: /./ },
] as const;

const telephone = (name: string) => name !== 'ordinateur';

/** Bas du bouton d'envoi, haut du bandeau cookies (ou de l'écran s'il n'y en a pas). */
async function mesurer(page: Page) {
  return page.evaluate(() => {
    const f = document.querySelector('[data-formulaire-inscription]')!;
    const champ = f.querySelector('select, input:not([type=hidden])')!.getBoundingClientRect();
    const bouton = f.querySelector('button[type=submit]')!.getBoundingClientRect();
    const bandeau = document.querySelector('[data-bandeau-cookies]')?.getBoundingClientRect();
    return {
      champ: champ.top,
      bouton: bouton.bottom,
      limite: bandeau && bandeau.height ? bandeau.top : innerHeight,
    };
  });
}

test.describe('Conversion : premier écran sur téléphone', () => {
  // Première visite : le bandeau cookies est affiché (aucun consentement enregistré).
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const viewport of [
    { width: 375, height: 667 },
    { width: 390, height: 844 },
  ]) {
    test(`ACQ-06 : ${viewport.width}×${viewport.height}, premier champ et bouton visibles sans défiler`, async ({
      page,
    }, info) => {
      test.skip(!telephone(info.project.name), 'Téléphone uniquement');
      await page.setViewportSize(viewport);
      for (const { url } of PAGES) {
        await page.goto(url);
        await expect(page.locator('[data-formulaire-inscription]')).toBeVisible();
        const m = await mesurer(page);
        expect(m.champ, url).toBeGreaterThan(0);
        expect(m.bouton, url).toBeLessThanOrEqual(m.limite);
        expect(await page.evaluate(() => scrollY), url).toBe(0);
      }
    });
  }

  test('ACQ-06 : le bandeau cookies se refuse aussi facilement qu’il s’accepte', async ({
    page,
  }, info) => {
    test.skip(!telephone(info.project.name), 'Téléphone uniquement');
    await page.goto('/pro');
    const refuser = page.getByRole('button', { name: 'Tout refuser' });
    const accepter = page.getByRole('button', { name: 'Tout accepter' });
    await expect(refuser).toBeVisible();
    await expect(accepter).toBeVisible();
    const [r, a] = await Promise.all([refuser.boundingBox(), accepter.boundingBox()]);
    expect(r!.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs(r!.width - a!.width)).toBeLessThan(4);
  });
});

test.describe('Conversion : formulaire court', () => {
  for (const { url } of PAGES) {
    test(`ACQ-07 : ${url} : trois champs, mentions et rassurance`, async ({ page }) => {
      await page.goto(url);
      const f = page.locator('[data-formulaire-inscription]');
      await expect(f.getByLabel(/^Métier principal/)).toBeVisible();
      await expect(f.getByLabel(/^Code postal/)).toHaveAttribute('autocomplete', 'postal-code');
      await expect(f.getByLabel(/^Email/)).toHaveAttribute('autocomplete', 'email');
      await expect(f.getByLabel(/^Nom et prénom/)).toHaveCount(0);
      await expect(f.getByLabel(/^Téléphone/)).toHaveCount(0);
      await expect(f.getByRole('checkbox')).toHaveCount(0);
      await expect(f.getByText('Gratuit · sans carte bancaire · 2 minutes')).toBeVisible();
      await expect(f.getByText(/En continuant, vous acceptez les/)).toBeVisible();
    });
  }

  test('ACQ-07 : ?metier= préremplit le métier sur une landing', async ({ page }) => {
    await page.goto('/pro/site-internet-artisan?metier=couvreur');
    await expect(page.getByLabel(/^Métier principal/)).toHaveValue('couvreur');
  });

  test('ACQ-07 : métier, code postal et email suffisent ; rien de personnel dans l’adresse', async ({
    page,
  }) => {
    let envoye: Record<string, unknown> | null = null;
    await page.route('**/api/pro/inscription', (r) => {
      envoye = r.request().postDataJSON() as Record<string, unknown>;
      return r.fulfill({ status: 200, json: { ok: true, data: null } });
    });
    await page.route('**/pro/inscription/zone**', (r) => r.fulfill({ status: 200, body: 'zone' }));
    await page.goto('/pro');
    await page.getByLabel(/^Métier principal/).selectOption('couvreur');
    await page.getByLabel(/^Code postal/).fill('33000');
    await page.getByLabel(/^Email/).fill('julien@example.fr');
    await page.getByRole('button', { name: 'Voir les demandes de ma zone' }).click();
    await expect.poll(() => envoye).not.toBeNull();
    expect(Object.keys(envoye!).sort()).not.toContain('nom');
    expect(envoye).not.toHaveProperty('telephone');
    expect(envoye).not.toHaveProperty('cgv');
    await expect(page).toHaveURL(/\/pro\/inscription\/zone/);
    expect(page.url()).not.toMatch(/julien|example|33000/);
  });
});

test.describe('Conversion : barre mobile', () => {
  test('ACQ-08 : cachée avec le formulaire à l’écran, visible ensuite, mène au premier champ vide', async ({
    page,
  }, info) => {
    test.skip(!telephone(info.project.name), 'Téléphone uniquement');
    for (const { url } of PAGES) {
      await page.goto(url);
      const barre = page.locator('[data-barre-mobile]');
      await expect(barre).toBeHidden();
      await page.evaluate(() => scrollTo(0, innerHeight * 3));
      await expect(barre).toBeVisible();
      const lien = barre.getByRole('link').or(barre.getByRole('button')).first();
      const boite = await lien.boundingBox();
      expect(boite!.height).toBeGreaterThanOrEqual(44);
      await lien.click();
      await expect(page.getByLabel(/^Métier principal/)).toBeFocused();
      await expect(barre).toBeHidden();
    }
  });

  test('ACQ-08 : invisible sur ordinateur', async ({ page }, info) => {
    test.skip(telephone(info.project.name), 'Ordinateur uniquement');
    await page.goto('/pro');
    await page.evaluate(() => scrollBy(0, innerHeight * 3));
    await expect(page.locator('[data-barre-mobile]')).toBeHidden();
  });
});
