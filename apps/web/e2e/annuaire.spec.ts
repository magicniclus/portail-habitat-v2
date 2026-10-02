import { expect, test, type Page } from '@playwright/test';

// docs/ACCEPTANCE.md ANN-01 à ANN-06 et FIC-01 à FIC-03. Données : jeu de test en mémoire
// (ANNUAIRE_DEMO=1, voir playwright.config.ts), autour de Bordeaux.
const formulaire = (page: Page) => page.getByRole('form', { name: 'Filtres' });

async function filtres(page: Page) {
  const bouton = page.getByRole('button', { name: /^Filtres/ });
  if (await bouton.isVisible()) await bouton.click();
  return formulaire(page);
}

test.describe('Annuaire', () => {
  test('ANN-01 : filtres dans l’URL, conservés au rechargement', async ({ page }) => {
    await page.goto('/artisans?metier=plombier&rayon=30');
    await expect(page.getByRole('heading', { name: 'Bertrand Rénovation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Atelier Lumière' })).toHaveCount(0);
    const f = await filtres(page);
    await expect(f.getByRole('checkbox', { name: 'Plombier' })).toBeChecked();
    await f.getByText('Électricien', { exact: true }).click();
    await expect(page).toHaveURL(/metier=plombier%2Celectricien/);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Atelier Lumière' })).toBeVisible();
    await expect(
      (await filtres(page)).getByRole('checkbox', { name: 'Électricien' }),
    ).toBeChecked();
  });

  test('ANN-02 : chips retirables et « Tout effacer »', async ({ page }) => {
    await page.goto('/artisans?metier=plombier,electricien&note=4');
    const chips = page.getByRole('list', { name: 'Filtres actifs' });
    await expect(chips.getByRole('link')).toHaveCount(4);
    await chips.getByRole('link', { name: /^Plombier/ }).click();
    await expect(page).toHaveURL(/metier=electricien&note=4$/);
    await page
      .getByRole('list', { name: 'Filtres actifs' })
      .getByRole('link', { name: 'Tout effacer' })
      .click();
    await expect(page).toHaveURL(/\/artisans$/);
    await expect(page.getByRole('list', { name: 'Filtres actifs' })).toHaveCount(0);
  });

  test('ANN-03 : Premium en tête et signalés, mention L111-7 visible', async ({ page }) => {
    await page.goto('/artisans');
    const une = page.getByRole('region', { name: /Artisans à la une/ });
    await expect(une.locator('article').first()).toContainText('Premium');
    const premiers = await page
      .locator('#resultats article')
      .evaluateAll((els) =>
        els.map((e) => e.closest('section[aria-labelledby="titre-une"]') !== null),
      );
    expect(premiers.indexOf(false)).toBeGreaterThan(0);
    expect(premiers.slice(premiers.indexOf(false)).every((x) => !x)).toBe(true);
    await expect(
      page.getByText(/Les profils Premium apparaissent en tête de liste, signalés comme tels/),
    ).toBeVisible();
  });

  test('ANN-04 : « douche italienne » trouve l’artisan qui a ce mot-clé', async ({ page }) => {
    await page.goto('/artisans');
    await page.getByRole('searchbox', { name: /Métier, entreprise/ }).fill('douche italienne');
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await expect(page).toHaveURL(/q=douche\+italienne/);
    await expect(page.getByRole('heading', { name: 'Bertrand Rénovation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Atelier Lumière' })).toHaveCount(0);
  });

  test('ANN-05 : aucun résultat → proposition de déposer un projet', async ({ page }) => {
    await page.goto('/artisans?q=zzzzqqq');
    await expect(page.getByText('Aucun artisan ne correspond à ces critères')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Déposer mon projet' }).last()).toHaveAttribute(
      'href',
      '/simulateur',
    );
  });

  test('ANN-06 : téléphone seulement pour Premium ou Visibilité', async ({ page }) => {
    await page.goto('/artisans?metier=menuisier,plombier&rayon=40');
    const carte = (nom: string) =>
      page.locator('article', { has: page.getByRole('heading', { name: nom }) });
    await expect(
      carte('Bertrand Rénovation').getByRole('link', { name: /^Appeler/ }),
    ).toBeVisible();
    await expect(carte('Menuiserie Latour')).toBeVisible();
    await expect(carte('Menuiserie Latour').getByRole('link', { name: /^Appeler/ })).toHaveCount(0);
  });
});

test.describe('Fiche publique', () => {
  test('FIC-01 : seuls les labels vérifiés', async ({ page }) => {
    await page.goto('/artisans/bertrand-renovation-bordeaux');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Bertrand Rénovation' }),
    ).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Labels vérifiés' }).getByRole('listitem'),
    ).toHaveText([/Décennale vérifiée/, /Qualibat/, /Répond sous 24 h/, /Réalisations photos/]);
  });

  test('FIC-02 : fiche hors ligne ou inconnue → 404', async ({ page }) => {
    for (const slug of ['maison-faure-52-carbon-blanc', 'fiche-qui-n-existe-pas']) {
      const r = await page.goto(`/artisans/${slug}`);
      expect(r?.status()).toBe(404);
    }
  });

  test('FIC-03 : JSON-LD LocalBusiness avec la note et le nombre d’avis', async ({ page }) => {
    await page.goto('/artisans/bertrand-renovation-bordeaux');
    const blocs = await page.locator('script[type="application/ld+json"]').allTextContents();
    const ld = blocs
      .map((b) => JSON.parse(b) as Record<string, unknown>)
      .find((b) => b['@type'] === 'LocalBusiness');
    expect(ld).toMatchObject({
      name: 'Bertrand Rénovation',
      aggregateRating: { '@type': 'AggregateRating', reviewCount: 4 },
    });
  });

  test('« Demander un devis » cible l’artisan dans le simulateur', async ({ page }) => {
    await page.goto('/artisans/bertrand-renovation-bordeaux');
    await expect(page.getByRole('link', { name: 'Demander un devis' }).first()).toHaveAttribute(
      'href',
      '/simulateur?artisan=seed-a-00',
    );
  });
});
