import { expect, test, type Page } from '@playwright/test';

// docs/ACCEPTANCE.md AVI-01 à AVI-04. Le statut `en_attente` et le refus du doublon (même email,
// même artisan, même mois) sont vérifiés côté serveur sur émulateur ; ici les routes sont simulées.
const ARTISANS = [
  {
    id: 'art-1',
    nom: 'Bertrand Rénovation',
    ville: 'Mérignac',
    metier: 'Plombier',
    note: 4.9,
    nbAvis: 37,
  },
  {
    id: 'art-2',
    nom: 'Atelier Lumière',
    ville: 'Bordeaux',
    metier: 'Électricien',
    note: 4.7,
    nbAvis: 52,
  },
];

const moisPrecedent = () => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
};

async function jusquAuFormulaire(page: Page) {
  await page.route('**/api/avis/artisans', (r) => r.fulfill({ json: { artisans: ARTISANS } }));
  await page.goto('/avis');
  // Saisie avant l'hydratation (WebKit lent) : perdue ; on recommence jusqu'au résultat.
  await expect(async () => {
    await page.getByRole('searchbox').fill('mérignac');
    await expect(page.getByText('1 artisan trouvé')).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Laisser un avis sur Bertrand Rénovation' }).click();
  await expect(
    page.getByRole('heading', { name: 'Votre avis sur Bertrand Rénovation' }),
  ).toBeVisible();
}

/** Toucher l'étoile (l'étiquette visible), comme un utilisateur : le bouton radio est masqué. */
async function noter(page: Page, n: number) {
  const radio = page.getByRole('radio', { name: new RegExp(`^${n} étoiles?`) }).first();
  await radio.locator('xpath=..').click();
  await expect(radio).toBeChecked();
}

async function remplir(page: Page) {
  await noter(page, 5);
  await page.getByLabel(/^Nom affiché/).fill('Camille M.');
  await page.getByLabel(/^Email/).fill('camille@example.fr');
  await page.getByLabel(/^Type de travaux/).selectOption('Plomberie');
  await page.getByLabel(/^Fin du chantier/).fill(moisPrecedent());
  await page.getByRole('checkbox', { name: /Je certifie/ }).check();
}

test.describe('Laisser un avis', () => {
  test('AVI-01 : publication impossible sans note ni certification', async ({ page }) => {
    await jusquAuFormulaire(page);
    const publier = page.getByRole('button', { name: 'Publier mon avis' });
    await expect(publier).toBeDisabled();
    await noter(page, 4);
    await expect(publier).toBeDisabled();
    await page.getByRole('checkbox', { name: /Je certifie/ }).check();
    await expect(publier).toBeEnabled();
    await page.getByRole('checkbox', { name: /Je certifie/ }).uncheck();
    await expect(publier).toBeDisabled();
  });

  test('AVI-02 : le commentaire s’arrête à 1 200 caractères', async ({ page }) => {
    await jusquAuFormulaire(page);
    const champ = page.getByLabel(/^Votre commentaire/);
    await champ.fill('a'.repeat(1300));
    await expect(champ).toHaveValue('a'.repeat(1200));
    await expect(page.getByText('1200 / 1200 caractères')).toBeVisible();
  });

  test('AVI-03 : l’avis envoyé part en vérification, sans statut venu du navigateur', async ({
    page,
  }) => {
    let corps: Record<string, unknown> = {};
    await page.route('**/api/avis', (r) => {
      corps = r.request().postDataJSON() as Record<string, unknown>;
      return r.fulfill({ status: 201, json: { ok: true, data: { avisId: 'avis-e2e' } } });
    });
    await jusquAuFormulaire(page);
    await remplir(page);
    await page.getByRole('button', { name: 'Devis clair' }).click();
    await page.getByRole('button', { name: 'Publier mon avis' }).click();
    await expect(page.getByRole('heading', { name: 'Merci, votre avis est envoyé' })).toBeVisible();
    await expect(page.getByText(/relit sous 48/)).toBeVisible();
    expect(corps).toMatchObject({
      artisanId: 'art-1',
      note: 5,
      pointsPositifs: ['Devis clair'],
      certification: true,
    });
    expect(corps).not.toHaveProperty('statut');
  });

  test('AVI-04 : un deuxième avis pour le même chantier est refusé', async ({ page }) => {
    await page.route('**/api/avis', (r) =>
      r.fulfill({
        status: 409,
        json: { ok: false, code: 'CONFLIT', message: 'Conflit' },
      }),
    );
    await jusquAuFormulaire(page);
    await remplir(page);
    await page.getByRole('button', { name: 'Publier mon avis' }).click();
    await expect(page.getByText(/déjà laissé un avis sur cet artisan/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Merci, votre avis est envoyé' })).toBeHidden();
  });
});
