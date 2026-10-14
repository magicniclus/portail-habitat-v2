import { chemins } from '@ph/firebase/chemins';
import { expect, test, type Page } from '@playwright/test';
import { admin, COMPTES, connecter, entrepriseDe, liensEnvoyes } from './outils';

// docs/ACCEPTANCE.md DEV-01, DEV-02, DEV-05 (+ DEV-03, DEV-04, DEV-06, DEV-07 en tests unitaires).
const PARAMS = {
  schemaVersion: 1,
  raisonSociale: 'Bertrand Rénovation',
  formeJuridique: 'SARL',
  adresseSiege: '14 rue des Faures, 33800 Bordeaux',
  siret: '81234567800021',
  franchiseTva: false,
  tvaSurDebits: false,
  assuranceDecennale: { assureur: 'MAAF', contrat: '0045821', zone: 'France métropolitaine' },
  mediateur: { nom: 'CM2C', adresse: '14 rue Saint-Jean, 75017 Paris' },
  delaiPaiementJours: 30,
  acompteDefautPct: 30,
  validiteDevisJours: 30,
  tvaDefaut: 10,
  tauxPenalitesAnnuel: 12.15,
};

async function parametres(valeurs: Record<string, unknown> | null) {
  const { db, Timestamp } = await admin();
  const ref = db.doc(chemins.parametresFacturation(await entrepriseDe(COMPTES.proprio)));
  if (valeurs) await ref.set({ ...valeurs, updatedAt: Timestamp.now() });
  else await ref.delete();
}

async function remplir(page: Page, o: { email?: string; pro?: string } = {}) {
  if (o.pro !== undefined) {
    await page.getByRole('radio', { name: 'Professionnel' }).check();
    await page.getByLabel(/^SIREN du client/).fill(o.pro);
  }
  await page.getByLabel(/^Nom du client/).fill('Claire Martin');
  if (o.email) await page.getByLabel(/^Email du client/).fill(o.email);
  await page.getByLabel(/^Adresse du chantier/).fill('3 rue des Lilas, 33700 Mérignac');
  await page.getByLabel(/^Objet du devis/).fill('Rénovation salle de bain');
  await page.getByLabel('Début des travaux').fill('2026-11-16');
  await page.getByLabel('Durée estimée').fill('5 jours ouvrés');
  const ligne = page.getByRole('group', { name: 'Ligne 1' });
  await ligne.getByLabel('Désignation').fill('Pose receveur extra-plat');
  await ligne.getByLabel('PU HT (€)').fill('690');
}

test.describe('Devis & factures', () => {
  test.describe.configure({ mode: 'serial' });

  test('DEV-01 : il manque des mentions → envoi refusé avec la liste ; jamais d’aperçu PDF', async ({
    page,
  }) => {
    await parametres(null);
    await connecter(page, COMPTES.proprio, '/pro/devis/nouveau');
    await remplir(page, { email: 'claire@test.local' });
    await expect(page.getByTestId('total-ttc-devis')).toHaveText(/759,00/);
    await expect(page.locator('[data-mention="assurance_decennale"]')).toHaveAttribute(
      'data-ok',
      'false',
    );
    await page.getByRole('button', { name: 'Envoyer au client' }).click();
    await expect(
      page.getByText(/Envoi impossible, il manque : Identité de l’entreprise, Assurance décennale/),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/pro\/devis\/nouveau$/);
    // DEV-05 : aucun aperçu du PDF dans l'éditeur (le cadre invisible de reCAPTCHA est hors de main).
    await expect(page.locator('main').locator('iframe, embed, object')).toHaveCount(0);
    await expect(page.locator('iframe[src*=".pdf"], embed[type="application/pdf"]')).toHaveCount(0);
  });

  test('paramètres de facturation enregistrés depuis l’écran', async ({ page }) => {
    await parametres(null);
    await connecter(page, COMPTES.proprio, '/pro/devis/parametres');
    await page.getByLabel('Raison sociale').fill('Bertrand Rénovation');
    await page.getByLabel('Adresse du siège').fill('14 rue des Faures, 33800 Bordeaux');
    await page.getByLabel('SIRET').fill('81234567800021');
    await page.getByLabel('Assureur').fill('MAAF');
    await page.getByLabel('N° de contrat').fill('0045821');
    await page.getByLabel('Couverture géographique').fill('France');
    await page.getByLabel('Nom', { exact: true }).fill('CM2C');
    await page.getByLabel('Adresse', { exact: true }).fill('14 rue Saint-Jean, 75017 Paris');
    await page.getByRole('button', { name: 'Enregistrer les paramètres' }).click();
    await expect(page.getByText('Paramètres enregistrés.')).toBeVisible();
  });

  test('DEV-02 : client professionnel sans SIREN valide → envoi refusé', async ({ page }) => {
    await parametres(PARAMS);
    await connecter(page, COMPTES.proprio, '/pro/devis/nouveau');
    await remplir(page, { email: 'achats@sci.test', pro: '1234' });
    await expect(page.locator('[data-mention="siren_client"]')).toHaveAttribute('data-ok', 'false');
    await page.getByRole('button', { name: 'Envoyer au client' }).click();
    await expect(page.getByText(/Envoi impossible, il manque : SIREN du client/)).toBeVisible();
  });

  test('DEV-05 : envoi, PDF téléchargé = PDF reçu par le client ; facture puis paiement', async ({
    page,
  }, info) => {
    await parametres(PARAMS);
    const email = `client-${info.project.name}-${Date.now()}@test.local`;
    const avant = new Set(await liensEnvoyes('/api/devis-client/'));
    await connecter(page, COMPTES.proprio, '/pro/devis/nouveau');
    await remplir(page, { email });
    await page.getByRole('button', { name: 'Envoyer au client' }).click();
    await expect(page).toHaveURL(/\/pro\/devis\/(?!nouveau)[^/]+$/, { timeout: 20_000 });
    const telecharger = page.getByRole('link', { name: 'Télécharger le PDF' });
    await expect(telecharger).toBeVisible();
    const pro = await page.request.get((await telecharger.getAttribute('href'))!);
    expect(pro.headers()['content-type']).toBe('application/pdf');
    const lien = (await liensEnvoyes('/api/devis-client/')).find((l) => !avant.has(l))!;
    expect(lien).toBeTruthy();
    const client = await page.request.get(new URL(lien).pathname, { headers: { cookie: '' } });
    expect(Buffer.compare(await pro.body(), await client.body())).toBe(0);

    await page.getByRole('button', { name: 'Le client a accepté' }).click();
    await page.getByRole('button', { name: 'Transformer en facture' }).click();
    await expect(page).toHaveURL(/\/pro\/devis\/factures\//, { timeout: 20_000 });
    await expect(page.getByTestId('reste-a-payer')).toHaveText(/759,00/);
    await page.getByRole('button', { name: 'Enregistrer le paiement' }).click();
    await expect(page.getByText('Payée')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Télécharger le PDF' })).toBeVisible();
  });

  test('le comptable ne voit pas l’éditeur de devis', async ({ page }) => {
    await connecter(page, COMPTES.compta, '/pro/abonnement');
    await page.goto('/pro/devis/nouveau');
    await expect(page).not.toHaveURL(/\/pro\/devis/);
  });
});
