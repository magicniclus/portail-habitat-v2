import { expect, test, type Page, type Route } from '@playwright/test';

// docs/ACCEPTANCE.md SIM-01 à SIM-08. Le calcul lui-même (prix privés, région, aides) est testé
// côté serveur sur émulateur (packages/firebase/tests/demandes.test.ts) et dans packages/core.
// Ici, la route /api/demandes est simulée : on vérifie ce que le navigateur envoie et affiche.

const REPONSE = {
  ok: true,
  data: {
    demandeId: 'demande-e2e',
    reference: 'PH-7K2Q9M',
    prestation: { id: 'peinture', nom: 'Peinture' },
    estimation: {
      minCentimes: 412_345,
      maxCentimes: 598_765,
      aidesCentimes: 0,
      tvaPourcent: 10,
      noteRegion: 'Île-de-France : les tarifs relevés sont environ 16 % au-dessus de la moyenne.',
      postes: [
        { label: 'Préparation des murs', minCentimes: 102_000, maxCentimes: 151_000 },
        { label: 'Deux couches de peinture', minCentimes: 310_345, maxCentimes: 447_765 },
      ],
    },
    reponsesLisibles: [{ question: 'Surface à peindre', reponse: '30 m²' }],
    ville: 'Paris',
  },
};

const montantEuros = new RegExp('\\d[\\d\\s\\u202f\\u00a0]*€');

async function jusquAuxCoordonnees(page: Page, cp = '75011') {
  await page.goto('/simulateur?prestation=peinture');
  await expect(page).toHaveURL(/etape=2|prestation=peinture$/);
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page).toHaveURL(/etape=3/);
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page).toHaveURL(/etape=4/);
  await page.getByLabel('Code postal du chantier').fill(cp);
  await page.getByRole('button', { name: 'Dernière étape' }).click();
  await expect(page).toHaveURL(/etape=5/);
}

async function remplirCoordonnees(page: Page) {
  await page.getByLabel(/^Prénom/).fill('Camille');
  await page.getByLabel(/^Nom/).fill('Martin');
  await page.getByLabel(/^Email/).fill('camille@test.local');
  await page.getByLabel(/^Téléphone/).fill('06 12 34 56 78');
  await page.getByText("J'accepte que mes données").click();
}

test.describe('Simulateur de devis', () => {
  test('étape 1 : recherche et familles, puis démarrage des questions', async ({ page }) => {
    await page.goto('/simulateur');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Quel type de travaux');
    await expect(page.getByText(/112 types de travaux estimables/)).toBeVisible();
    await page.getByLabel('Rechercher un type de travaux ou un métier').fill('peinture');
    await page
      .getByRole('listitem')
      .getByRole('button', { name: /^Peinture Murs/ })
      .click();
    await expect(page).toHaveURL(/prestation=peinture&etape=2/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Votre projet en détail');
  });

  test('SIM-01 et SIM-07 : envoi → référence PH-XXXXXX et estimation du serveur affichée', async ({
    page,
  }) => {
    await page.route('**/api/demandes', (r: Route) => r.fulfill({ status: 201, json: REPONSE }));
    await jusquAuxCoordonnees(page);
    await remplirCoordonnees(page);
    await page.getByRole('button', { name: 'Voir mon estimation' }).click();
    await expect(page.locator('[data-test="fourchette"]')).toHaveText(/4\s?120\s–\s5\s?990\s€/);
    await expect(page.locator('[data-test="reference"]')).toHaveText(/^PH-[A-Z0-9]{6}$/);
    await expect(page.getByText('Deux couches de peinture')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Suivre ma demande' })).toHaveAttribute(
      'href',
      '/mon-espace/demandes/demande-e2e',
    );
  });

  test('SIM-01b : aucun montant en euros avant l’envoi (page et réseau)', async ({ page }) => {
    const montantsReseau: string[] = [];
    page.on('response', async (r) => {
      const type = r.headers()['content-type'] ?? '';
      // Données reçues (JSON, flux RSC), pas le code JavaScript qui nomme ces champs.
      if (!/json|text\/x-component|text\/html/.test(type)) return;
      const corps = await r.text().catch(() => '');
      if (/minCentimes|maxCentimes|prixCentimes|unitaire/.test(corps)) montantsReseau.push(r.url());
    });
    await page.goto('/simulateur');
    await expect(page.locator('main')).not.toContainText(montantEuros);
    await jusquAuxCoordonnees(page);
    await expect(page.locator('main')).not.toContainText(montantEuros);
    expect(montantsReseau).toEqual([]);
  });

  test('SIM-02 : l’étape est dans l’URL, le retour du navigateur revient à l’étape précédente', async ({
    page,
  }) => {
    await page.goto('/simulateur?prestation=peinture&etape=2');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page).toHaveURL(/etape=3/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Options et finitions');
    await page.goBack();
    await expect(page).toHaveURL(/etape=2/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Votre projet en détail');
  });

  test('SIM-03 : code postal vide → blocage et message lié au champ', async ({ page }) => {
    await page.goto('/simulateur?prestation=peinture&etape=4');
    await page.getByRole('button', { name: 'Dernière étape' }).click();
    await expect(page).toHaveURL(/etape=4/);
    const cp = page.getByLabel('Code postal du chantier');
    await expect(cp).toHaveAttribute('aria-invalid', 'true');
    await expect(cp).toHaveAccessibleDescription(/code postal à 5 chiffres/);
    await expect(cp).toBeFocused();
  });

  test('SIM-03 : coordonnées incomplètes → erreurs liées aux champs, rien n’est envoyé', async ({
    page,
  }) => {
    let appels = 0;
    await page.route('**/api/demandes', (r: Route) => {
      appels++;
      return r.fulfill({ status: 201, json: REPONSE });
    });
    await jusquAuxCoordonnees(page);
    await page.getByLabel(/^Prénom/).fill('Camille');
    await page.getByLabel(/^Téléphone/).fill('12');
    await page.getByRole('button', { name: 'Voir mon estimation' }).click();
    await expect(page.getByLabel(/^Téléphone/)).toHaveAccessibleDescription(/téléphone invalide/i);
    await expect(page.getByLabel(/^Email/)).toHaveAttribute('aria-invalid', 'true');
    expect(appels).toBe(0);
  });

  test('SIM-05 : les aides apparaissent en négatif sur le résultat', async ({ page }) => {
    const avecAides = structuredClone(REPONSE);
    avecAides.data.estimation.aidesCentimes = 220_000;
    await page.route('**/api/demandes', (r: Route) => r.fulfill({ status: 201, json: avecAides }));
    await jusquAuxCoordonnees(page);
    await remplirCoordonnees(page);
    await page.getByRole('button', { name: 'Voir mon estimation' }).click();
    await expect(page.getByText("Aides estimées (MaPrimeRénov' + CEE)")).toBeVisible();
    await expect(page.getByText(/^− 2\s?200\s€$/)).toBeVisible();
  });

  test('SIM-08 : la requête d’envoi ne contient aucun montant', async ({ page }) => {
    let corps: Record<string, unknown> = {};
    await page.route('**/api/demandes', (r: Route) => {
      corps = r.request().postDataJSON() as Record<string, unknown>;
      return r.fulfill({ status: 201, json: REPONSE });
    });
    await jusquAuxCoordonnees(page);
    await remplirCoordonnees(page);
    await page.getByRole('button', { name: 'Voir mon estimation' }).click();
    await expect(page.locator('[data-test="reference"]')).toBeVisible();
    expect(corps).toMatchObject({
      prestationId: 'peinture',
      codePostal: '75011',
      contact: { prenom: 'Camille', email: 'camille@test.local' },
      accepteConfidentialite: true,
    });
    expect(JSON.stringify(corps)).not.toMatch(/estimation|centimes|prix|€/i);
  });

  test('arrivée depuis l’accueil : prestation, intention et code postal repris', async ({
    page,
  }) => {
    let corps: Record<string, unknown> = {};
    await page.route('**/api/demandes', (r: Route) => {
      corps = r.request().postDataJSON() as Record<string, unknown>;
      return r.fulfill({ status: 201, json: REPONSE });
    });
    await page.goto('/simulateur?prestation=peinture&intention=peinture-murs&cp=33000&delai=1mois');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByLabel('Code postal du chantier')).toHaveValue('33000');
    await page.getByRole('button', { name: 'Dernière étape' }).click();
    await remplirCoordonnees(page);
    await page.getByRole('button', { name: 'Voir mon estimation' }).click();
    await expect(page.locator('[data-test="reference"]')).toBeVisible();
    expect(corps).toMatchObject({
      source: 'hero',
      intention: 'peinture-murs',
      codePostal: '33000',
      delaiSouhaite: '1mois',
    });
  });
});
