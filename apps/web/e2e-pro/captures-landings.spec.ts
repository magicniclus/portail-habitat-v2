import { chemins } from '@ph/firebase/chemins';
import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { admin, COMPTES, connecter, entrepriseDe } from './outils';

/**
 * Captures réelles des outils Site internet et Devis & factures pour les landings (LANDINGS §6,
 * complète `pnpm captures` pour les écrans livrés après le lot 10e). Le compte de démo du jeu de
 * test prépare un vrai site et de vrais devis par l'interface, puis chaque écran est photographié.
 * Lancement manuel (émulateurs + jeu de test + build) :
 *   CAPTURES=1 pnpm --filter @ph/web exec playwright test -c playwright.pro.config.ts captures-landings --project ordinateur
 * Écrit apps/web/public/landing/captures/{ecran}-{desktop|mobile}.webp et .avif.
 */
const SORTIE = fileURLToPath(new URL('../public/landing/captures', import.meta.url));
const SLUG = 'bertrand-renovation';
const ORDI = { width: 1280, height: 800 };
const TEL = { width: 390, height: 844 };

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

async function photo(page: Page, nom: string, appareil: 'desktop' | 'mobile') {
  await page.waitForTimeout(900);
  // Adresse de test (`*.localhost`) affichée comme en production.
  await page.evaluate(() => {
    const parcours = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = parcours.nextNode(); n; n = parcours.nextNode())
      if (n.nodeValue?.includes('.localhost'))
        n.nodeValue = n.nodeValue.replace(/\.localhost(:\d+)?/g, '.portailtravaux.fr');
  });
  const image = await page.screenshot({ type: 'png' });
  const f = join(SORTIE, `${nom}-${appareil}`);
  await sharp(image).webp({ quality: 82 }).toFile(`${f}.webp`);
  await sharp(image).avif({ quality: 60 }).toFile(`${f}.avif`);
  console.log(`✓ ${nom}-${appareil}`);
}

/** Les deux formats d'un même écran. */
async function deuxFormats(page: Page, nom: string, url: string) {
  for (const [taille, appareil] of [
    [ORDI, 'desktop'],
    [TEL, 'mobile'],
  ] as const) {
    await page.setViewportSize(taille);
    await page.goto(url);
    await page.waitForLoadState('load');
    await photo(page, nom, appareil);
  }
}

const LIGNES: [string, string, string][] = [
  ['Dépose de la baignoire et évacuation des gravats', '1', '380'],
  ['Pose d’un receveur extra-plat 90 × 120', '1', '690'],
  ['Faïence murale grand format, pose collée', '12', '65'],
  ['Mitigeur thermostatique et colonne de douche', '1', '245'],
];

async function nouveauDevis(page: Page, client: string, objet: string, lignes = LIGNES) {
  await page.goto('/pro/devis/nouveau');
  await page.getByLabel('Nom du client').fill(client);
  await page
    .getByLabel('Email du client')
    .fill(`${client.split(' ')[0]!.toLowerCase()}@exemple.fr`);
  await page.getByLabel('Adresse du client').fill('3 rue des Lilas, 33700 Mérignac');
  await page.getByLabel('Objet du devis').fill(objet);
  for (const [i, [designation, quantite, prix]] of lignes.entries()) {
    if (i > 0) await page.getByRole('button', { name: 'Ligne simple' }).click();
    const ligne = page.getByRole('group', { name: `Ligne ${i + 1}` });
    await ligne.getByLabel('Désignation').fill(designation);
    await ligne.getByLabel('Quantité').fill(quantite);
    await ligne.getByLabel('PU HT (€)').fill(prix);
  }
  await page.getByRole('checkbox', { name: 'Début et durée des travaux' }).check();
  await page.getByLabel('Début des travaux').fill('2026-11-16');
  await page.getByLabel('Durée estimée').fill('5 jours ouvrés');
  await page.getByLabel('Durée estimée').blur();
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) if (el.scrollTop > 0) el.scrollTop = 0;
    window.scrollTo(0, 0);
  });
}

test.describe('captures des landings', () => {
  test.use({ locale: 'fr-FR' });
  test.skip(!process.env.CAPTURES, 'lancement manuel');

  test('site internet et devis', async ({ page }, info) => {
    test.skip(info.project.name !== 'ordinateur', 'une seule passe');
    test.setTimeout(600_000);
    page.setDefaultTimeout(20_000);
    mkdirSync(SORTIE, { recursive: true });
    const { db, Timestamp } = await admin();
    const id = await entrepriseDe(COMPTES.proprio);
    await db.doc(chemins.parametresFacturation(id)).set({ ...PARAMS, updatedAt: Timestamp.now() });

    await page.setViewportSize(ORDI);
    await connecter(page, COMPTES.proprio, '/pro/site');

    // Site : création (site de départ tiré de la fiche), publication.
    const creer = page.getByRole('button', { name: 'Créer mon site' });
    if (await creer.isVisible().catch(() => false)) {
      await page.getByLabel(/^Adresse de votre site/).fill(SLUG);
      await creer.click();
      await page.getByRole('link', { name: 'Ouvrir l’éditeur' }).first().waitFor();
    }
    await page.goto('/pro/site/editeur?creation=1');
    await page.waitForLoadState('load');
    await photo(page, 'site-creation', 'desktop');

    await page.goto('/pro/site/editeur');
    await page.waitForTimeout(2500);
    const apercu = page.frameLocator('iframe[title="Aperçu de la page"]');
    await apercu.locator('h1').first().click();
    await photo(page, 'site-editeur', 'desktop');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Publier', exact: true }).click();
    await page.waitForTimeout(3000);

    await page.goto('/pro/site?onglet=formulaire');
    await photo(page, 'site-formulaire', 'desktop');

    // Site publié (cache de 30 s des sites publiés).
    await page.waitForTimeout(31_000);
    await deuxFormats(page, 'site-publie', `http://${SLUG}.localhost:3200/`);

    // Devis : trois documents à des stades différents, une facture.
    await page.setViewportSize(ORDI);
    await nouveauDevis(page, 'Claire Martin', 'Rénovation salle de bain');
    await photo(page, 'devis-editeur', 'desktop');
    await page.getByRole('button', { name: 'Valider', exact: true }).click();
    await page.waitForURL(/\/pro\/devis\/(?!nouveau)[^/]+$/, { timeout: 30_000 });
    await page.getByRole('button', { name: 'Envoyer au client' }).click();
    await page.getByText('Devis envoyé au client par email.').waitFor();
    await page.getByRole('button', { name: 'Le client a accepté' }).click();
    await page.getByRole('button', { name: 'Transformer en facture' }).click();
    await page.getByRole('button', { name: 'Émettre la facture' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Émettre la facture' }).click();
    await page.waitForTimeout(3000);

    await nouveauDevis(page, 'Julien Moreau', 'Isolation des combles perdus', [
      ['Isolation des combles soufflée, laine de verre 32 cm', '85', '28'],
      ['Rehausse de trappe et pare-vapeur', '1', '160'],
    ]);
    await page.getByRole('button', { name: 'Valider', exact: true }).click();
    await page.waitForURL(/\/pro\/devis\/(?!nouveau)[^/]+$/, { timeout: 30_000 });
    await page.getByRole('button', { name: 'Envoyer au client' }).click();
    await page.getByText('Devis envoyé au client par email.').waitFor();

    await nouveauDevis(page, 'Sophie Laurent', 'Peinture séjour et couloir', [
      ['Préparation des supports et enduit de lissage', '48', '12'],
      ['Peinture velours deux couches', '48', '18'],
    ]);
    await page.getByRole('button', { name: 'Créer le devis' }).click();
    await page.waitForURL(/\/pro\/devis\/(?!nouveau)[^/]+/, { timeout: 30_000 });

    await deuxFormats(page, 'devis-liste', '/pro/devis');
    await page.setViewportSize(ORDI);
    await page.goto('/pro/devis?onglet=factures');
    await photo(page, 'devis-factures', 'desktop');
  });
});
