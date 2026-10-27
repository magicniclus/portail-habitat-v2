import { createHash } from 'node:crypto';
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

/** Panneau Options : ouvert à droite sur ordinateur, feuille du bas à ouvrir sur mobile. */
async function options(page: Page, faire: () => Promise<void>) {
  const mobile = !(await page.getByRole('complementary', { name: 'Options' }).isVisible());
  if (mobile) await page.getByRole('button', { name: 'Options', exact: true }).click();
  await faire();
  if (mobile) await page.keyboard.press('Escape');
}

async function remplir(page: Page, o: { email?: string; pro?: string } = {}) {
  await page.getByLabel('Nom du client').fill('Claire Martin');
  if (o.email) await page.getByLabel('Email du client').fill(o.email);
  await page.getByLabel('Adresse du client').fill('3 rue des Lilas, 33700 Mérignac');
  await page.getByLabel('Objet du devis').fill('Rénovation salle de bain');
  const ligne = page.getByRole('group', { name: 'Ligne 1' });
  await ligne.getByLabel('Désignation').fill('Pose receveur extra-plat');
  await ligne.getByLabel('PU HT (€)').fill('690');
  await page.getByLabel('Début des travaux').fill('2026-11-16');
  await page.getByLabel('Durée estimée').fill('5 jours ouvrés');
  if (o.pro !== undefined) {
    // Options › Client : la case fait apparaître le SIREN sur la feuille.
    await options(page, () =>
      page.getByRole('checkbox', { name: 'SIREN ou SIRET (client professionnel)' }).check(),
    );
    await page.getByLabel('SIREN du client').fill(o.pro);
  }
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
    await options(page, () =>
      expect(page.locator('[data-mention="assurance_decennale"]')).toHaveAttribute(
        'data-ok',
        'false',
      ),
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
    await options(page, () =>
      expect(page.locator('[data-mention="siren_client"]')).toHaveAttribute('data-ok', 'false'),
    );
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
    await expect(page).not.toHaveURL(/\/modifier$/);
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

  test('« Nouvelle facture » sans devis : même feuille, émise après confirmation, PDF prêt', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/devis');
    await page.getByRole('link', { name: '+ Nouvelle facture' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Nouvelle facture' })).toBeVisible();
    await page.getByLabel('Nom du client').fill('Claire Martin');
    await page.getByLabel('Adresse du client').fill('3 rue des Lilas, 33700 Mérignac');
    await page.getByLabel('Objet de la facture').fill('Dépannage chauffe-eau');
    const ligne = page.getByRole('group', { name: 'Ligne 1' });
    await ligne.getByLabel('Désignation').fill('Remplacement groupe de sécurité');
    await ligne.getByLabel('PU HT (€)').fill('120');
    await expect(page.getByTestId('total-ttc-devis')).toHaveText(/132,00/);
    await page.getByRole('button', { name: 'Émettre la facture' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Émettre la facture' }).click();
    await expect(page).toHaveURL(/\/pro\/devis\/factures\/[a-f0-9]{24}$/);
    await expect(page.getByRole('link', { name: 'Télécharger le PDF' })).toBeVisible();
  });

  test('Base clients : fiche ajoutée dans l’onglet Clients, choisie dans un devis', async ({
    page,
  }) => {
    const nom = `Client e2e ${Date.now()}`;
    await connecter(page, COMPTES.proprio, '/pro/devis?onglet=clients');
    await page.getByRole('button', { name: 'Ajouter un client' }).click();
    const form = page.getByRole('form', { name: 'Nouveau client' });
    await form.getByLabel('Nom ou raison sociale').fill(nom);
    await form.getByLabel('Adresse postale').fill('8 allée des Pins');
    await form.getByLabel('Ville').fill('Talence');
    await form.getByRole('button', { name: 'Ajouter le client' }).click();
    await expect(page.getByRole('list', { name: 'Base clients' })).toContainText(nom);

    await page.goto('/pro/devis/nouveau');
    await page.getByRole('button', { name: 'Choisir dans ma base' }).click();
    await page.getByLabel('Rechercher dans ma base').fill(nom);
    await page.getByRole('button', { name: new RegExp(nom) }).click();
    await expect(page.getByLabel('Nom du client')).toHaveValue(nom);
    await expect(page.getByLabel('Adresse du client')).toHaveValue('8 allée des Pins');
    await expect(page.getByText('Client de votre base')).toBeVisible();
  });

  test('Liste : dupliquer un devis, supprimer le brouillon ; un devis envoyé ne se supprime pas', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/devis');
    const premier = page.getByRole('button', { name: /^Actions du devis D-/ }).first();
    await premier.click();
    await page.getByRole('button', { name: 'Dupliquer le devis' }).click();
    await expect(page).toHaveURL(/\/pro\/devis\/[^/]+\/modifier$/);
    const numero = (await page.getByRole('heading', { level: 1 }).textContent())!.replace(
      'Devis ',
      '',
    );
    await page.goto('/pro/devis');
    await page.getByRole('button', { name: `Actions du devis ${numero}` }).click();
    await page.getByRole('button', { name: 'Supprimer le devis' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
    await expect(page.getByText(numero, { exact: true })).toHaveCount(0);
  });

  test('Facture : brouillon enregistré puis émis ; annulée depuis la liste par un avoir', async ({
    page,
  }) => {
    await parametres(PARAMS);
    await connecter(page, COMPTES.proprio, '/pro/devis/factures/nouvelle');
    await page.getByLabel('Nom du client').fill('Claire Martin');
    await page.getByLabel('Adresse du client').fill('3 rue des Lilas, 33700 Mérignac');
    await page.getByLabel('Objet de la facture').fill('Brouillon e2e');
    const ligne = page.getByRole('group', { name: 'Ligne 1' });
    await ligne.getByLabel('Désignation').fill('Réglage chaudière');
    await ligne.getByLabel('PU HT (€)').fill('90');
    await page.getByRole('button', { name: 'Enregistrer le brouillon' }).click();
    await expect(page).toHaveURL(/\/pro\/devis\/factures\/[^/]+\/modifier$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Brouillon de facture' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Émettre la facture' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Émettre la facture' }).click();
    await expect(page).toHaveURL(/\/pro\/devis\/factures\/[^/]+$/, { timeout: 20_000 });
    const titre = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';
    const numero = /F-\d{4}-\d{4}/.exec(titre)![0];

    await page.goto('/pro/devis?onglet=factures');
    await page.getByRole('button', { name: `Actions de la facture ${numero}` }).click();
    await expect(page.getByText('Suppression impossible')).toBeVisible();
    await page.getByRole('button', { name: 'Annuler la facture' }).click();
    const dialogue = page.getByRole('dialog');
    await dialogue.getByLabel(/^Motif/).fill('Erreur de client');
    await dialogue.getByRole('button', { name: 'Créer l’avoir' }).click();
    await expect(page.getByText(`avoir annulant la facture ${numero}`)).toBeVisible();
  });

  test('Fermer un devis modifié : « Enregistrer le brouillon » ou « Quitter » ; menu ⋮ visible', async ({
    page,
  }) => {
    const nom = `Fermeture ${Date.now()}`;
    await connecter(page, COMPTES.proprio, '/pro/devis/nouveau');
    await page.getByRole('button', { name: 'Fermer l’éditeur' }).click();
    await expect(page).toHaveURL(/\/pro\/devis$/);
    await page.goto('/pro/devis/nouveau');
    await page.getByLabel('Nom du client').fill(nom);
    await page.getByRole('button', { name: 'Fermer l’éditeur' }).click();
    const dialogue = page.getByRole('dialog', { name: 'Enregistrer avant de quitter ?' });
    await dialogue.getByRole('button', { name: 'Enregistrer le brouillon' }).click();
    await expect(page).toHaveURL(/\/pro\/devis$/);
    const ligne = page.getByRole('row').filter({ hasText: nom });
    await ligne.getByRole('button', { name: /^Actions du devis/ }).click();
    await expect(page.getByRole('button', { name: 'Supprimer le devis' })).toBeVisible();
  });

  test('le comptable ne voit pas l’éditeur de devis', async ({ page }) => {
    await connecter(page, COMPTES.compta, '/pro/abonnement');
    await page.goto('/pro/devis/nouveau');
    await expect(page).not.toHaveURL(/\/pro\/devis/);
  });

  test('Modèles : prestation ajoutée à la bibliothèque, reprise dans un devis ; modèle utilisé', async ({
    page,
  }) => {
    const { db, Timestamp } = await admin();
    const id = await entrepriseDe(COMPTES.proprio);
    await db.recursiveDelete(db.doc(chemins.prestationBiblio(id, '_')).parent);
    await db.recursiveDelete(db.doc(chemins.modeleDevis(id, '_')).parent);
    await db.doc(chemins.modeleDevis(id, 'mod-e2e')).set({
      schemaVersion: 1,
      titre: 'Plomberie d’urgence',
      lignes: [
        {
          designation: 'Recherche de fuite',
          quantite: 1,
          unite: 'forfait',
          puHtCentimes: 16000,
          tva: 20,
        },
      ],
      usage: 3,
      createdAt: Timestamp.now(),
    });
    await connecter(page, COMPTES.proprio, '/pro/devis?onglet=modeles');
    await expect(page.getByText('Utilisé 3 fois')).toBeVisible();

    await page.getByRole('button', { name: '+ Ajouter une prestation' }).click();
    const form = page.getByRole('form', { name: 'Nouvelle prestation' });
    await form.getByLabel('Désignation').fill('Faïence murale, fourniture et pose');
    await form.getByLabel('Unité').fill('m²');
    await form.getByLabel('Prix HT (€)').fill('78,00');
    await form.getByRole('button', { name: 'Ajouter' }).click();
    await expect(
      page.getByRole('cell', { name: 'Faïence murale, fourniture et pose', exact: true }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Utiliser ce modèle' }).click();
    await expect(page).toHaveURL(/\/pro\/devis\/nouveau\?modele=mod-e2e/);
    await expect(page.getByLabel('Objet du devis')).toHaveValue('Plomberie d’urgence');
    await expect(page.getByLabel('Désignation').first()).toHaveValue('Recherche de fuite');
    await page.getByRole('button', { name: 'Autres lignes' }).click();
    await page.getByRole('button', { name: 'Faïence murale, fourniture et pose' }).click();
    await expect(page.getByLabel('Désignation').nth(1)).toHaveValue(
      'Faïence murale, fourniture et pose',
    );
    await expect(page.getByLabel('PU HT (€)').nth(1)).toHaveValue('78,00');

    // Ligne de texte (hors totaux) enregistrée comme ligne type sans quitter le devis.
    await page.getByRole('button', { name: 'Autres lignes' }).click();
    await page.getByRole('button', { name: '+ Ligne de texte (titre, précision)' }).click();
    await page.getByLabel('Texte de la ligne').fill(`Préparation ${Date.now()}`);
    await page.getByRole('button', { name: 'Actions de la ligne 3' }).click();
    await page.getByRole('button', { name: 'Enregistrer comme ligne type' }).click();
    await expect(page.getByText(/ajoutée à vos lignes types/)).toBeVisible();
    await page.getByRole('button', { name: 'Autres lignes' }).click();
    await expect(page.getByRole('group', { name: 'Autres lignes' })).toContainText('¶ Préparation');
  });

  test('signature en ligne : le client accepte le devis depuis son lien, l’entreprise le voit', async ({
    page,
  }) => {
    const { db, Timestamp } = await admin();
    const id = await entrepriseDe(COMPTES.proprio);
    const jeton = `jeton-e2e-${Date.now()}-0123456789`;
    const ref = db.doc(chemins.unDevis(id, `sig-${Date.now()}`));
    await ref.set({
      schemaVersion: 1,
      numero: 'D-2026-9901',
      statut: 'envoye',
      client: { nom: 'Claire Martin', email: 'claire@test.local', adresse: 'Mérignac' },
      objet: 'Salle de bain e2e',
      totaux: { ttcCentimes: 110000, htCentimes: 100000, tva: { '10': 10000 } },
      signatureElectronique: true,
      validiteLe: Timestamp.fromMillis(Date.now() + 30 * 86_400_000),
      jetonHash: createHash('sha256').update(jeton).digest('hex'),
      hashPdf: 'a'.repeat(64),
      createdAt: Timestamp.now(),
    });
    await parametres(PARAMS);
    await page.goto(`/devis-client/${id}.${ref.id}.${jeton}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Devis D-2026-9901' })).toBeVisible();
    await page.getByRole('button', { name: 'Accepter le devis' }).click();
    // Nom et « Bon pour accord » obligatoires : le navigateur bloque l'envoi.
    await expect(page.getByText('Devis accepté')).toHaveCount(0);
    await page.getByLabel('Vos nom et prénom').fill('Claire Martin');
    await page.getByRole('checkbox', { name: /Bon pour accord/ }).check();
    await page.getByRole('button', { name: 'Accepter le devis' }).click();
    await expect(page.getByText('Devis accepté')).toBeVisible();
    const d = (await ref.get()).data()!;
    expect(d.statut).toBe('accepte');
    expect(d.signature).toMatchObject({ nom: 'Claire Martin', hashPdf: 'a'.repeat(64) });
    await page.reload();
    await expect(page.getByText(/^Accepté par Claire Martin le /)).toBeVisible();
    // Un autre jeton : page introuvable.
    const r = await page.goto(`/devis-client/${id}.${ref.id}.${'x'.repeat(30)}`);
    expect(r?.status()).toBe(404);
  });
});
