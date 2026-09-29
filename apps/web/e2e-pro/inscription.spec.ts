import { expect, test, type Page } from '@playwright/test';
import { MOT_DE_PASSE, PDF } from './outils';

// docs/ACCEPTANCE.md ONB-01 à 04 et ONB-07, sur les émulateurs et les SIREN du seed (cacheSirene).
const SIRENS = { libre: '552100554', fermee: '443061841', inscrite: '404833048' } as const;
const PROJET = 'demo-portail-habitat';

const emailUnique = (prefixe: string) =>
  `${prefixe}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

/** Communes servies sans appeler geo.api.gouv.fr (réseau de la CI). */
async function simulerLieux(page: Page) {
  await page.route('**/api/lieux?**', (r) =>
    r.fulfill({
      json: {
        lieux: [
          {
            nom: 'Mérignac',
            codePostal: '33700',
            centre: { latitude: 44.8386, longitude: -0.6436 },
          },
        ],
      },
    }),
  );
}

async function etape1(page: Page, email: string) {
  await page.goto('/pro');
  await page.getByLabel(/^Nom et prénom/).fill('Julien Bertrand');
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Téléphone/).fill('0612345678');
  await page.getByLabel(/^Code postal/).fill('33700');
  await page.getByLabel(/^Métier principal/).selectOption('couvreur');
  await page.getByRole('checkbox', { name: /conditions générales/ }).check();
  await page.getByRole('button', { name: 'Voir les demandes de ma zone' }).click();
  await expect(page).toHaveURL(/\/pro\/inscription\/zone$/);
}

/** Envois capturés par l'émulateur (`capturesEmulateur`) : liens de reprise déjà émis. */
async function liensReprise(): Promise<string[]> {
  const hote = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';
  const r = await fetch(
    `http://${hote}/v1/projects/${PROJET}/databases/(default)/documents/capturesEmulateur?pageSize=500`,
    { headers: { Authorization: 'Bearer owner' } },
  );
  const d = (await r.json()) as {
    documents?: {
      fields: { secrets?: { mapValue: { fields?: Record<string, { stringValue: string }> } } };
    }[];
  };
  return (d.documents ?? [])
    .map((doc) => doc.fields.secrets?.mapValue.fields?.lien?.stringValue ?? '')
    .filter((l) => l.includes('/pro/inscription?reprise='));
}

test.describe('Inscription pro', () => {
  test('ONB-07, ONB-01 à 03 : bouton inactif tant que l’étape est incomplète, entreprise vérifiée, activation', async ({
    page,
  }, info) => {
    // Le SIREN libre ne sert qu'une fois : le parcours complet tourne sur le projet mobile.
    test.skip(info.project.name !== 'iphone-13', 'SIREN libre à usage unique');
    await simulerLieux(page);
    await etape1(page, emailUnique('onb'));

    const suivante = page.getByRole('button', { name: 'Étape suivante' });
    await expect(suivante).toBeDisabled();
    await page.getByRole('combobox', { name: 'Votre ville' }).fill('Mérig');
    await page.getByRole('option', { name: /Mérignac/ }).click();
    await page.locator('label').filter({ hasText: '50 km' }).click();
    await expect(page.getByText(/dans un rayon de 50 km/)).toBeVisible();
    await expect(suivante).toBeEnabled();
    await suivante.click();
    await expect(page).toHaveURL(/\/pro\/inscription\/compte$/);

    const activer = page.getByRole('button', { name: 'Activer mon espace' });
    await expect(activer).toBeDisabled();
    const recherche = page.getByLabel(/^Nom ou numéro SIREN/);
    const entreprises = page.getByRole('list', { name: 'Entreprises trouvées' });

    await recherche.fill(SIRENS.fermee);
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await expect(entreprises).toContainText('Cette entreprise est fermée');
    await expect(entreprises.getByRole('radio')).toBeDisabled();

    await recherche.fill(SIRENS.inscrite);
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await expect(entreprises).toContainText('Cette entreprise a déjà un compte.');
    await expect(entreprises.getByRole('link', { name: 'Demander à rejoindre' })).toBeVisible();

    await recherche.fill(SIRENS.libre);
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await expect(entreprises).toContainText('SIREN 552 100 554');
    await entreprises.getByRole('radio').check();
    await page.getByLabel(/^Mot de passe/).fill(MOT_DE_PASSE);
    await expect(activer).toBeDisabled();
    await page.getByLabel(/^Confirmer le mot de passe/).fill(MOT_DE_PASSE);
    await page.getByRole('checkbox', { name: /conditions générales de vente/ }).check();
    await expect(activer).toBeEnabled();
    await activer.click();
    await expect(page).toHaveURL(/\/pro\/tableau-de-bord/, { timeout: 15_000 });
    // ONB-06 : propriétaire, fiche hors ligne, étapes de mise en ligne.
    await expect(page.getByText('Votre espace est créé')).toBeVisible();
    await expect(page.getByRole('heading', { name: '3 étapes pour être en ligne' })).toBeVisible();
    // Propriétaire : la facturation figure dans « Plus » (onglets mobiles).
    await page
      .getByRole('navigation', { name: 'Espace pro' })
      .getByRole('button', { name: 'Plus' })
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Plus' }).getByRole('link', { name: 'Facturation' }),
    ).toBeVisible();

    // ONB-06b : SIREN vérifié à l'inscription + décennale envoyée → fiche en ligne.
    await page.goto('/pro/fiche');
    await expect(page.getByText(/Votre fiche est hors ligne/)).toBeVisible();
    await page.getByLabel('Type de document').selectOption('decennale');
    await page.getByLabel(/^Fichier/).setInputFiles(PDF);
    await page.getByRole('button', { name: 'Envoyer le document' }).click();
    await expect(page.getByText(/Votre fiche est en ligne/).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('list', { name: 'Documents envoyés' })).toContainText(
      'En cours de vérification',
    );
  });

  test('ONB-04 : le lien reçu par email reprend l’inscription sur un autre appareil', async ({
    page,
    browser,
  }, info) => {
    const avant = new Set(await liensReprise());
    await etape1(page, emailUnique('reprise'));
    await expect
      .poll(async () => (await liensReprise()).filter((l) => !avant.has(l)))
      .toHaveLength(1);
    const [lien] = (await liensReprise()).filter((l) => !avant.has(l));

    // Autre appareil : contexte neuf, sans le cookie du brouillon.
    const autre = await browser.newContext({ baseURL: info.project.use.baseURL });
    const p2 = await autre.newPage();
    const url = new URL(lien!);
    await p2.goto(url.pathname + url.search);
    await expect(p2).toHaveURL(/\/pro\/inscription\/zone$/);
    await expect(p2.getByRole('combobox', { name: 'Votre ville' })).toBeVisible();
    await autre.close();
  });

  test('ONB-04 : lien invalide → retour au formulaire', async ({ page }) => {
    await page.goto('/pro/inscription?reprise=jeton-invalide-0000000000000000');
    await expect(page).toHaveURL(/\/pro\?reprise=expiree/);
  });
});
