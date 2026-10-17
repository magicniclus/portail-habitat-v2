import { expect, test, type Page } from '@playwright/test';

// docs/ACCEPTANCE.md DIA-01 à DIA-04 et DIA-06 (parcours). Le calcul du budget (prix privés, pack)
// est testé côté serveur sur émulateur ; ici la route /api/diagnostics est simulée.
const montantEuros = new RegExp('\\d[\\d\\s\\u202f\\u00a0]*€');
const dossier = (page: Page) => page.getByRole('list', { name: 'Diagnostics de votre bien' });
const ligne = (page: Page, nom: RegExp) =>
  dossier(page).getByRole('listitem').filter({ hasText: nom });

const REPONSE = {
  ok: true,
  data: {
    dossierId: 'dossier-e2e',
    reference: 'PHD-7K2Q9M',
    resultat: [
      {
        diagId: 'dpe',
        nom: 'DPE (performance énergétique)',
        statut: 'a_refaire',
        raison: '',
        prixMinCentimes: 11_000,
        prixMaxCentimes: 19_000,
      },
      {
        diagId: 'amiante',
        nom: 'État d’amiante',
        statut: 'a_realiser',
        raison: '',
        prixMinCentimes: 9_000,
        prixMaxCentimes: 16_000,
      },
      {
        diagId: 'termites',
        nom: 'Termites',
        statut: 'a_realiser',
        raison: '',
        prixMinCentimes: 9_000,
        prixMaxCentimes: 15_000,
      },
      {
        diagId: 'elec',
        nom: 'Électricité',
        statut: 'a_realiser',
        raison: '',
        prixMinCentimes: 9_500,
        prixMaxCentimes: 15_500,
      },
      {
        diagId: 'erp',
        nom: 'ERP',
        statut: 'a_realiser',
        raison: '',
        prixMinCentimes: 2_500,
        prixMaxCentimes: 5_500,
      },
    ],
    estimation: { minCentimes: 36_080, maxCentimes: 65_320, remisePack: true },
    aRealiser: 5,
    reutilises: 0,
    communeNom: 'Cenon',
  },
};

async function jusquAuDossier(page: Page, url: string, dpe2019 = false) {
  await page.goto(url);
  await page.getByLabel(/^Adresse du bien/).fill('12 rue Camille Pelletan');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Équipements et rapports existants',
  );
  if (dpe2019) {
    await page.getByText('DPE (performance énergétique)').click();
    await page.getByLabel('Année du rapport : DPE (performance énergétique)').selectOption('2019');
  }
  await page.getByRole('button', { name: 'Voir mon dossier' }).click();
}

test.describe('Parcours diagnostic', () => {
  test('DIA-01 : ?motif&type&periode&ville préremplissent le parcours', async ({ page }) => {
    await page.goto(
      '/diagnostic-immobilier/estimation?motif=location&type=maison&periode=av1949&ville=lormont',
    );
    await expect(page.getByLabel('Motif')).toHaveValue('location');
    await expect(page.getByLabel('Commune')).toHaveValue('lormont');
    await expect(page.getByRole('radio', { name: /Maison/ })).toBeChecked();
    await expect(page.getByRole('radio', { name: /Avant 1949/ })).toBeChecked();
  });

  test('DIA-02 : maison de 1968 à la vente → amiante, DPE, électricité, ERP à réaliser', async ({
    page,
  }) => {
    await jusquAuDossier(
      page,
      '/diagnostic-immobilier/estimation?motif=vente&type=maison&periode=1949-1976',
    );
    for (const nom of [
      /^État d.amiante/,
      /^DPE/,
      /^État de l.installation intérieure d.électricité/,
      /^État des risques/,
      /^État relatif à la présence de termites/,
    ])
      await expect(ligne(page, nom)).toContainText('À réaliser');
    await expect(ligne(page, /plomb/i)).toHaveCount(0);
  });

  test('DIA-03 : un DPE de 2019 est « à refaire »', async ({ page }) => {
    await jusquAuDossier(
      page,
      '/diagnostic-immobilier/estimation?motif=vente&type=maison&periode=1949-1976',
      true,
    );
    await expect(ligne(page, /DPE/)).toContainText('À refaire');
    await expect(ligne(page, /DPE/)).toContainText('Rapport de 2019 hors délai');
  });

  test('DIA-06 : liste visible sans aucun prix avant l’envoi ; budget et prix après', async ({
    page,
  }) => {
    let corps: Record<string, unknown> = {};
    await page.route('**/api/diagnostics', (r) => {
      corps = r.request().postDataJSON() as Record<string, unknown>;
      return r.fulfill({ json: REPONSE });
    });
    await jusquAuDossier(
      page,
      '/diagnostic-immobilier/estimation?motif=vente&type=maison&periode=1949-1976',
      true,
    );
    await expect(dossier(page)).toBeVisible();
    await expect(page.locator('main')).not.toContainText(montantEuros);

    await page.getByLabel(/^Nom et prénom/).fill('Camille Martin');
    await page.getByLabel(/^Email/).fill('camille@test.local');
    await page.getByLabel(/^Téléphone/).fill('0612345678');
    await page.getByText('J’accepte d’être contacté'.replace(/’/g, "'")).click();
    await page.getByRole('button', { name: 'Voir mon budget' }).click();

    await expect(page.locator('[data-test="reference"]')).toHaveText('PHD-7K2Q9M');
    await expect(page.locator('[data-test="budget"]')).toContainText('€');
    await expect(page.getByRole('listitem').filter({ hasText: 'ERP' })).toContainText('€');
    expect(JSON.stringify(corps)).not.toMatch(/centimes|prix|estimation|€/i);
    expect(corps).toMatchObject({
      bien: { communeSlug: 'cenon', type: 'maison', periode: '1949-1976', motif: 'vente' },
      existants: [{ diagId: 'dpe', annee: 2019 }],
    });
  });

  test('DIA-04 : 4 diagnostics ou plus → remise pack indiquée sur le résultat', async ({
    page,
  }) => {
    await page.route('**/api/diagnostics', (r) => r.fulfill({ json: REPONSE }));
    await jusquAuDossier(
      page,
      '/diagnostic-immobilier/estimation?motif=vente&type=maison&periode=1949-1976',
    );
    await page.getByLabel(/^Nom et prénom/).fill('Camille Martin');
    await page.getByLabel(/^Email/).fill('camille@test.local');
    await page.getByLabel(/^Téléphone/).fill('0612345678');
    await page.getByText('J’accepte d’être contacté'.replace(/’/g, "'")).click();
    await page.getByRole('button', { name: 'Voir mon budget' }).click();
    await expect(page.getByText(/Tarif pack appliqué, une seule visite sur place/)).toBeVisible();
  });
});
