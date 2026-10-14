import { expect, test, type Page } from '@playwright/test';

// docs/LANDINGS.md §8 (LAND-01 à LAND-07) : landing « Trouver des chantiers », ouverte par défaut.
const URL_LANDING = '/pro/trouver-des-chantiers';

/** `dataLayer` gardé dans sessionStorage : les événements survivent à la navigation. */
async function suivreDataLayer(page: Page) {
  await page.addInitScript(() => {
    const garder = (e: unknown) => {
      const l = JSON.parse(sessionStorage.getItem('dl') ?? '[]') as unknown[];
      sessionStorage.setItem('dl', JSON.stringify([...l, e]));
    };
    const dl: unknown[] = [];
    dl.push = (...e: unknown[]) => {
      e.forEach(garder);
      return Array.prototype.push.apply(dl, e);
    };
    (window as unknown as { dataLayer: unknown[] }).dataLayer = dl;
  });
}
const evenements = (page: Page) =>
  page.evaluate(
    () => JSON.parse(sessionStorage.getItem('dl') ?? '[]') as { event: string; landing: string }[],
  );

async function remplir(page: Page) {
  await page.getByLabel(/^Nom et prénom/).fill('Julien Bertrand');
  await page.getByLabel(/^Email/).fill('julien@example.fr');
  await page.getByLabel(/^Téléphone/).fill('0612345678');
  await page.getByLabel(/^Code postal/).fill('33000');
  await page.getByLabel(/^Métier principal/).selectOption('couvreur');
  await page.getByRole('checkbox', { name: /conditions générales/ }).check();
}

test.describe('Landings par outil', () => {
  test('LAND-01 : la source et la campagne partent avec le formulaire', async ({ page }) => {
    await suivreDataLayer(page);
    let envoye: Record<string, unknown> | null = null;
    await page.route('**/api/pro/inscription', (r) => {
      envoye = r.request().postDataJSON() as Record<string, unknown>;
      return r.fulfill({ status: 200, json: { ok: true, data: null } });
    });
    await page.route('**/pro/inscription/zone**', (r) => r.fulfill({ status: 200, body: 'zone' }));
    await page.goto(`${URL_LANDING}?utm_source=google&utm_campaign=chantiers-33`);
    await remplir(page);
    await page.getByRole('button', { name: 'Voir les demandes près de chez moi' }).click();
    await expect.poll(() => envoye).not.toBeNull();
    expect(envoye!.acquisition).toEqual({
      source: 'trouver-chantier',
      utm_source: 'google',
      utm_campaign: 'chantiers-33',
    });
    await expect(page).toHaveURL(/\/pro\/inscription\/zone\?source=trouver-chantier$/);
    const ev = (await evenements(page)).map((e) => e.event);
    expect(ev).toContain('hero_form_started');
    expect(ev).toContain('hero_form_submitted');
  });

  test('LAND-02 et LAND-07 : une seule action orange au premier écran, ni prix ni chiffre non sourcé', async ({
    page,
  }) => {
    await page.goto(URL_LANDING);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Trouvez des chantiers gratuitement',
    );
    const hero = page.locator('main > section').first();
    // « 0 € à l'inscription » n'est pas un prix ; aucun montant d'offre avant l'inscription (PAY-01).
    await expect(hero).not.toContainText(/[1-9]\d*(,\d+)?\s?€|\bHT\b|\bTTC\b/);
    const orangesVisibles = await page
      .locator('a.bg-accent-action, button.bg-accent-action')
      .evaluateAll(
        (els) =>
          els.filter((e) => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
          }).length,
      );
    expect(orangesVisibles).toBeLessThanOrEqual(1);
    const texte = await page.locator('body').innerText();
    expect(texte).not.toMatch(/300 demandes|premier réseau|centaines d.euros/i);
    await expect(page.getByRole('region', { name: 'Avis d’artisans' })).toHaveCount(0);
  });

  test('LAND-04 : preuve sociale absente sans donnée réelle', async ({ page }) => {
    await page.goto(URL_LANDING);
    await expect(page.locator('[data-preuve-sociale]')).toHaveCount(0);
  });

  test('LAND-05 : barre mobile masquée quand un formulaire est visible ; tous les CTA vont au formulaire', async ({
    page,
  }, info) => {
    await suivreDataLayer(page);
    await page.goto(URL_LANDING);
    const liens = await page
      .locator('main a')
      .evaluateAll((els) =>
        els.filter((a) => !a.closest('form')).map((a) => a.getAttribute('href')),
      );
    expect(liens.length).toBeGreaterThan(5);
    expect(new Set(liens)).toEqual(new Set(['#inscription']));
    const barre = page.locator('[data-barre-mobile]');
    if (info.project.name === 'ordinateur') {
      await expect(barre).toBeHidden();
      return;
    }
    await page.locator('#inscription').scrollIntoViewIfNeeded();
    await expect(barre).toBeHidden();
    await page.locator('#faq').scrollIntoViewIfNeeded();
    await expect(barre).toBeVisible();
    // Clic réel au centre du bouton (la barre est fixe : pas de défilement automatique).
    const b = (await barre.getByRole('link').boundingBox())!;
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await expect(page).toHaveURL(/#inscription$/);
    await expect(barre).toBeHidden();
    expect((await evenements(page)).map((e) => e.event)).toContain('sticky_cta_clicked');
  });

  test('LAND-06 : événements avec `landing` (FAQ, section gratuite, CTA final)', async ({
    page,
  }) => {
    await suivreDataLayer(page);
    await page.goto(URL_LANDING);
    await page.locator('[data-section-gratuit]').scrollIntoViewIfNeeded();
    await page.getByText('Prenez-vous une commission sur mes chantiers ?').click();
    await page.locator('[data-cta-final]').click();
    await expect
      .poll(async () => (await evenements(page)).map((e) => e.event))
      .toEqual(
        expect.arrayContaining(['pricing_section_viewed', 'faq_opened', 'final_cta_clicked']),
      );
    for (const e of await evenements(page)) expect(e.landing).toBe('chantiers');
  });

  test('LAND-03 : un geste de défilement = une étape, sortie libre après la 3e et avant la 1re', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'ordinateur', 'Aimantation des étapes sur ordinateur');
    await page.goto(URL_LANDING);
    const onglet = (n: number) => page.getByRole('tab', { name: new RegExp(`Étape ${n}`) });
    const zone = page.locator('[data-scrolly]');
    await zone.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const z = document.querySelector('[data-scrolly]')!;
      window.scrollTo(0, window.scrollY + z.getBoundingClientRect().top - 44);
    });
    await expect(onglet(1)).toHaveAttribute('aria-selected', 'true');
    // Fin du défilement programmé (et d'une éventuelle aimantation) avant le premier geste.
    await page.waitForTimeout(900);
    await page.mouse.move(400, 400);
    for (const n of [2, 3]) {
      await page.mouse.wheel(0, 120);
      await expect(onglet(n)).toHaveAttribute('aria-selected', 'true');
      await page.waitForTimeout(900);
      await expect(onglet(n)).toHaveAttribute('aria-selected', 'true');
    }
    // Sortie libre après la 3e : le défilement continue vers la section suivante.
    const avant = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(avant + 300);
    // Clavier : un onglet amène à son étape.
    await zone.scrollIntoViewIfNeeded();
    await onglet(2).click();
    await expect(onglet(2)).toHaveAttribute('aria-selected', 'true');
  });

  test('landings site et devis fermées tant que l’outil n’est pas livré', async ({ page }) => {
    for (const url of ['/pro/site-internet-artisan', '/pro/logiciel-devis-factures']) {
      const r = await page.goto(url);
      expect(r?.status()).toBe(404);
    }
  });
});
