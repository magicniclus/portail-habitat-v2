import { expect, test, type Page } from '@playwright/test';

// docs/ACCEPTANCE.md ESP-01 à ESP-04. La session réelle, le refus de la demande d'un autre (404)
// et le masquage à l'enregistrement sont testés sur émulateur ; ici les routes sont simulées.
const T = Date.UTC(2026, 8, 22, 10);
const DEMANDES = [
  {
    id: 'd1',
    reference: 'PH-4K82Q9',
    titre: 'Rénovation de salle de bain',
    ville: 'Bordeaux',
    envoyeeLe: T,
    statut: 'devis_recus',
    estimation: { minCentimes: 780_000, maxCentimes: 1_040_000 },
    nbArtisans: 3,
    nbDevis: 2,
  },
  {
    id: 'd2',
    reference: 'PH-9M31T2',
    titre: 'Peinture du séjour',
    ville: 'Bordeaux',
    envoyeeLe: T - 86_400_000,
    statut: 'en_attribution',
    estimation: { minCentimes: 190_000, maxCentimes: 260_000 },
    nbArtisans: 0,
    nbDevis: 0,
  },
];
const artisan = (artisanId: string, nom: string, statut: string, devisCentimes?: number) => ({
  artisanId,
  nom,
  note: 4.8,
  nbAvis: 40,
  statut,
  etat: statut === 'vue' ? 'Demande vue, réponse attendue' : 'Devis envoyé',
  ...(devisCentimes ? { devisCentimes } : {}),
});
const DETAIL = {
  ...DEMANDES[0],
  reponsesLisibles: [],
  artisans: [
    artisan('a2', 'SM Carrelage', 'vue'),
    artisan('a1', 'Bertrand Rénovation', 'devis_envoye', 924_000),
    artisan('a3', 'Aqua Confort 33', 'devis_envoye', 861_000),
  ],
  messages: [
    {
      id: 'm1',
      artisanId: 'a2',
      deMoi: false,
      texte: 'Je passe jeudi prendre les mesures.',
      le: T,
    },
  ],
};

async function connecte(page: Page, detail: unknown = { ok: true, data: DETAIL }) {
  await page
    .context()
    .addCookies([{ name: '__session', value: 'e2e', domain: 'localhost', path: '/' }]);
  await page.route('**/api/mon-espace/demandes', (r) =>
    r.fulfill({
      json: {
        ok: true,
        data: {
          profil: { prenom: 'Camille', email: 'camille@example.fr', telephone: '+33612345621' },
          demandes: DEMANDES,
        },
      },
    }),
  );
  await page.route('**/api/mon-espace/demande', (r) =>
    r.fulfill({ status: (detail as { ok: boolean }).ok ? 200 : 404, json: detail }),
  );
}

test.describe('Mon espace particulier', () => {
  test('sans session : retour à la connexion', async ({ page }) => {
    await page.goto('/mon-espace');
    await expect(page).toHaveURL(/\/connexion\?suite=%2Fmon-espace/);
    await expect(page.getByRole('heading', { name: 'Accéder à mon espace' })).toBeVisible();
  });

  test('ESP-01 : mes demandes avec statut, nombre d’artisans et de devis', async ({ page }) => {
    await connecte(page);
    await page.goto('/mon-espace');
    await expect(page.getByRole('heading', { name: 'Bonjour Camille' })).toBeVisible();
    const liste = page.getByRole('navigation', { name: 'Mes demandes' });
    await expect(liste.getByRole('link')).toHaveCount(2);
    await expect(liste.getByText('Devis reçus')).toBeVisible();
    await expect(liste.getByText('2 devis · 1 artisan en attente')).toBeVisible();
    await expect(liste.getByText('Artisans en cours de sélection')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rénovation de salle de bain' })).toBeVisible();
    await expect(page.getByText('Bertrand Rénovation', { exact: true })).toBeVisible();
    await expect(page.getByText('2 devis reçus. Prenez le temps de comparer')).toBeVisible();
  });

  test('ESP-02 : la demande d’un autre particulier est introuvable', async ({ page }) => {
    await connecte(page, { ok: false, code: 'INTROUVABLE', message: 'Introuvable' });
    await page.goto('/mon-espace/demandes/demande-d-un-autre');
    await expect(page.getByText(/Cette demande est introuvable/)).toBeVisible();
    await expect(page.getByText('Bertrand Rénovation')).toHaveCount(0);
  });

  test('ESP-03 : lire et envoyer un message ; numéro signalé avant acceptation', async ({
    page,
  }) => {
    await connecte(page);
    let corps: Record<string, unknown> = {};
    await page.route('**/api/mon-espace/messages', (r) => {
      corps = r.request().postDataJSON() as Record<string, unknown>;
      return r.fulfill({ json: { ok: true, data: { messageId: 'm2', masque: true } } });
    });
    await page.goto('/mon-espace/demandes/d1');
    const fil = page.getByRole('list', { name: 'Messages avec SM Carrelage' });
    await expect(fil.getByText('Je passe jeudi prendre les mesures.')).toBeVisible();
    await page.getByLabel('Votre message').fill('Appelez-moi au 06 12 34 56 78');
    await expect(page.getByText(/numéros de téléphone et emails sont masqués/)).toBeVisible();
    await page.getByRole('button', { name: 'Envoyer' }).click();
    await expect.poll(() => corps.artisanId).toBe('a2');
    expect(corps).toMatchObject({ demandeId: 'd1', texte: 'Appelez-moi au 06 12 34 56 78' });
    await expect(page.getByLabel('Votre message')).toHaveValue('');
  });

  test('ESP-04 : exporter mes données et supprimer mon compte en deux temps', async ({ page }) => {
    await connecte(page);
    await page.route('**/api/mon-espace/export', (r) =>
      r.fulfill({ json: { ok: true, data: { profil: { email: 'camille@example.fr' } } } }),
    );
    let supprime = false;
    await page.route('**/api/mon-espace/suppression', (r) => {
      supprime = true;
      return r.fulfill({ json: { ok: true, data: null } });
    });
    await page.goto('/mon-espace/compte');
    const telechargement = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Télécharger' }).click();
    expect((await telechargement).suggestedFilename()).toBe('mes-donnees-portail-habitat.json');

    await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
    const fenetre = page.getByRole('dialog', { name: 'Supprimer mon compte ?' });
    const confirmer = fenetre.getByRole('button', { name: 'Supprimer définitivement' });
    await expect(confirmer).toBeDisabled();
    await fenetre.getByLabel('Pour confirmer, tapez SUPPRIMER').fill('SUPPRIMER');
    await confirmer.click();
    await expect(page).toHaveURL(/\/\?compte=supprime$/);
    expect(supprime).toBe(true);
  });
});

test.describe('Connexion par lien magique', () => {
  test('la réponse ne dit pas si le compte existe (CON-01)', async ({ page }) => {
    await page.route('**/api/connexion/lien', (r) => r.fulfill({ json: { ok: true, data: null } }));
    await page.goto('/connexion');
    await page.getByLabel(/^Votre adresse email/).fill('inconnu@example.fr');
    await page.getByRole('button', { name: 'Recevoir mon lien de connexion' }).click();
    await expect(page.getByText(/Si inconnu@example\.fr correspond à un compte/)).toBeVisible();
  });

  test('retour du lien : adresse ressaisie, puis la page demandée', async ({ page }) => {
    let corps: Record<string, unknown> = {};
    await page.route('**/api/connexion/verifier', (r) => {
      corps = r.request().postDataJSON() as Record<string, unknown>;
      return r.fulfill({ json: { ok: true, data: null } });
    });
    await connecte(page);
    await page.goto('/connexion/lien?oobCode=CodeDeTest0123456&suite=%2Fmon-espace%2Fcompte');
    await page.getByLabel(/^Votre adresse email/).fill('camille@example.fr');
    await page.getByRole('button', { name: 'Me connecter' }).click();
    await expect(page).toHaveURL(/\/mon-espace\/compte$/);
    expect(corps).toEqual({ email: 'camille@example.fr', oobCode: 'CodeDeTest0123456' });
  });

  test('un lien vers un autre site est ignoré', async ({ page }) => {
    await page.route('**/api/connexion/verifier', (r) =>
      r.fulfill({ json: { ok: true, data: null } }),
    );
    await connecte(page);
    await page.goto('/connexion/lien?oobCode=CodeDeTest0123456&suite=%2F%2Fexemple.com');
    await page.getByLabel(/^Votre adresse email/).fill('camille@example.fr');
    await page.getByRole('button', { name: 'Me connecter' }).click();
    await expect(page).toHaveURL(/localhost:\d+\/mon-espace$/);
  });
});
