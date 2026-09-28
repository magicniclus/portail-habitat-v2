import { expect, test, type Page } from '@playwright/test';

// docs/REPRISE_PARCOURS.md §7 : SIM-06a à SIM-06f, SIM-06i et SIM-06j (niveau 1, brouillon local).
const CLE = 'ph:parcours:simulateur';
const JOUR = 86_400_000;

const brouillon = (autres: Record<string, unknown>) => ({
  v: 1,
  id: 'brouillone2e0001',
  parcours: 'simulateur',
  versionReferentiel: '2026-09',
  prestationId: 'peinture',
  etape: 3,
  reponses: {},
  chantier: { codePostal: '33000', acces: 'facile' },
  creeLe: Date.now() - 2 * JOUR,
  majLe: Date.now() - 2 * JOUR,
  ...autres,
});

async function deposer(page: Page, b: unknown) {
  await page.addInitScript(
    ([cle, valeur]) => {
      // Une seule fois : le parcours doit pouvoir réécrire ou effacer le brouillon ensuite.
      if (!sessionStorage.getItem('e2e-depose')) {
        localStorage.setItem(cle!, valeur!);
        sessionStorage.setItem('e2e-depose', '1');
      }
    },
    [CLE, JSON.stringify(b)],
  );
}

const lireStockage = (page: Page) => page.evaluate((cle) => localStorage.getItem(cle), CLE);
const encart = (page: Page) => page.getByRole('region', { name: 'Reprendre votre estimation ?' });

test.describe('Reprise du simulateur', () => {
  test('SIM-06a et SIM-06b : quitter à l’étape 3, revenir, reprendre avec les mêmes réponses', async ({
    page,
  }) => {
    await page.goto('/simulateur?prestation=peinture&etape=2');
    await page.getByLabel('Surface à peindre').focus();
    await page.keyboard.press('ArrowRight');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page).toHaveURL(/etape=3/);
    await expect.poll(() => lireStockage(page)).toContain('"etape":3');

    await page.goto('/');
    await page.goto('/simulateur');
    await expect(encart(page)).toContainText('Peinture · 50 m²');
    await expect(encart(page)).toContainText(/Étape 3 sur 5 · commencée/);
    await encart(page).getByRole('button', { name: 'Reprendre à l’étape 3' }).click();
    await expect(page).toHaveURL(/prestation=peinture&etape=3/);
    await expect(page.getByText('Estimation reprise. Vos réponses sont restaurées.')).toBeVisible();
    await expect(page.getByRole('complementary').getByText('50 m²')).toBeVisible();
  });

  test('SIM-06c : « Recommencer » efface, « Annuler » restaure', async ({ page }) => {
    await deposer(page, brouillon({ reponses: { surface: 60 } }));
    await page.goto('/simulateur');
    await encart(page).getByRole('button', { name: 'Recommencer' }).click();
    await expect(encart(page)).toBeHidden();
    expect(await lireStockage(page)).toBeNull();
    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(encart(page)).toBeVisible();
    expect(await lireStockage(page)).toContain('"surface":60');
  });

  test('SIM-06d : aucune donnée de contact dans le stockage local', async ({ page }) => {
    await page.goto('/simulateur?prestation=peinture&etape=2');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByLabel('Code postal du chantier').fill('33000');
    await page.getByRole('button', { name: 'Dernière étape' }).click();
    await page.getByLabel(/^Prénom/).fill('Camille');
    await page.getByLabel(/^Email/).fill('camille@test.local');
    await page.getByLabel(/^Téléphone/).fill('0612345678');
    await page.waitForTimeout(600);
    const tout = await page.evaluate(() =>
      Object.keys(localStorage)
        .map((k) => `${k}=${localStorage.getItem(k)}`)
        .join('\n'),
    );
    expect(tout).toContain('"codePostal":"33000"');
    expect(tout).not.toMatch(/Camille|camille@|0612345678|\+33612345678/);
  });

  test('SIM-06e : champ disparu du référentiel → reprise à l’étape de ce champ', async ({
    page,
  }) => {
    // Étape 4 enregistrée, mais la réponse « gamme » (étape 3) n'est plus valide.
    await deposer(
      page,
      brouillon({
        etape: 4,
        reponses: {
          surface: 45,
          pieces: 2,
          hauteur: 'std',
          etat: 'bon',
          extras: [],
          gamme: 'option-supprimee',
        },
      }),
    );
    await page.goto('/simulateur');
    await encart(page).getByRole('button', { name: 'Reprendre à l’étape 3' }).click();
    await expect(page).toHaveURL(/etape=3/);
    await expect(page.getByText(/Certaines réponses ont été retirées/)).toBeVisible();
  });

  test('SIM-06f : après l’envoi, plus d’encart au retour', async ({ page }) => {
    await page.route('**/api/demandes', (r) =>
      r.fulfill({
        status: 201,
        json: {
          ok: true,
          data: {
            demandeId: 'd1',
            reference: 'PH-7K2Q9M',
            prestation: { id: 'peinture', nom: 'Peinture' },
            estimation: {
              minCentimes: 100_000,
              maxCentimes: 200_000,
              aidesCentimes: 0,
              tvaPourcent: 10,
              noteRegion: 'Gironde',
              postes: [],
            },
            reponsesLisibles: [],
            ville: 'Bordeaux',
          },
        },
      }),
    );
    await page.goto('/simulateur?prestation=peinture&etape=2');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByLabel('Code postal du chantier').fill('33000');
    await page.getByRole('button', { name: 'Dernière étape' }).click();
    await page.getByLabel(/^Prénom/).fill('Camille');
    await page.getByLabel(/^Nom/).fill('Martin');
    await page.getByLabel(/^Email/).fill('camille@test.local');
    await page.getByLabel(/^Téléphone/).fill('0612345678');
    await page.getByText("J'accepte que mes données").click();
    await page.getByRole('button', { name: 'Voir mon estimation' }).click();
    await expect(page.locator('[data-test="reference"]')).toBeVisible();
    await expect.poll(() => lireStockage(page)).toBeNull();
    await page.goto('/simulateur');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Quel type de travaux');
    await expect(encart(page)).toHaveCount(0);
  });

  test('SIM-06i : stockage local bloqué, le simulateur fonctionne sans erreur', async ({
    page,
  }) => {
    const erreurs: string[] = [];
    page.on('pageerror', (e) => erreurs.push(e.message));
    await page.addInitScript(() => {
      const refus = () => {
        throw new DOMException('Bloqué', 'SecurityError');
      };
      Storage.prototype.getItem = refus;
      Storage.prototype.setItem = refus;
      Storage.prototype.removeItem = refus;
    });
    await page.goto('/simulateur?prestation=peinture&etape=2');
    await page.getByLabel('Surface à peindre').focus();
    await page.keyboard.press('ArrowRight');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page).toHaveURL(/etape=3/);
    await page.waitForTimeout(600);
    expect(erreurs).toEqual([]);
  });

  test('SIM-06j : arrivée avec une autre prestation → celle-ci s’ouvre, lien vers la première', async ({
    page,
  }) => {
    await deposer(page, brouillon({ prestationId: 'sdb', etape: 3 }));
    await page.goto('/simulateur?prestation=peinture');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Votre projet en détail');
    await expect(
      page.getByText('Vous aviez aussi commencé une estimation salle de bain.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Y revenir' }).click();
    await expect(page).toHaveURL(/prestation=sdb&etape=\d/);
  });

  test('SIM-06g : case cochée → lien demandé pour le brouillon courant, sans coordonnées', async ({
    page,
  }) => {
    let corps: Record<string, unknown> | null = null;
    await page.route('**/api/parcours/lien', (r) => {
      corps = r.request().postDataJSON() as Record<string, unknown>;
      return r.fulfill({ json: { ok: true, data: { brouillonId: 'brouillon-serveur-1' } } });
    });
    let demande: Record<string, unknown> = {};
    await page.route('**/api/demandes', (r) => {
      demande = r.request().postDataJSON() as Record<string, unknown>;
      return r.fulfill({ status: 500, json: { ok: false, code: 'INTERNE', message: 'x' } });
    });
    await page.goto('/simulateur?prestation=peinture&etape=4');
    await page.getByLabel('Code postal du chantier').fill('33000');
    await page.getByRole('button', { name: 'Dernière étape' }).click();
    await page.getByLabel(/^Email/).fill('camille@test.local');
    await page.getByText('M’envoyer un lien pour reprendre plus tard'.replace('’', "'")).click();
    await expect(page.getByText('Lien envoyé à camille@test.local.')).toBeVisible();
    expect(corps).toMatchObject({
      email: 'camille@test.local',
      brouillon: { prestationId: 'peinture', etape: 5, chantier: { codePostal: '33000' } },
    });
    expect(JSON.stringify((corps as unknown as { brouillon: unknown }).brouillon)).not.toContain(
      'camille',
    );
    // Le brouillon serveur accompagne la demande pour être supprimé avec elle.
    await page.getByLabel(/^Prénom/).fill('Camille');
    await page.getByLabel(/^Nom/).fill('Martin');
    await page.getByLabel(/^Téléphone/).fill('0612345678');
    await page.getByText("J'accepte que mes données").click();
    await page.getByRole('button', { name: 'Voir mon estimation' }).click();
    await expect.poll(() => demande.brouillonId).toBe('brouillon-serveur-1');
  });

  test('SIM-06h : sans la case, aucun lien de reprise, même avec un email saisi', async ({
    page,
  }) => {
    let appels = 0;
    await page.route('**/api/parcours/lien', (r) => {
      appels++;
      return r.fulfill({ json: { ok: true, data: { brouillonId: 'x' } } });
    });
    await page.goto('/simulateur?prestation=peinture&etape=5');
    await page.getByLabel(/^Email/).fill('camille@test.local');
    await page.getByLabel(/^Prénom/).fill('Camille');
    await page.waitForTimeout(500);
    expect(appels).toBe(0);
  });

  test('SIM-06g : lien ouvert sur un autre appareil → étape enregistrée ; lien usé → expiré', async ({
    page,
  }) => {
    let utilise = false;
    await page.route('**/api/parcours/reprise', (r) => {
      if (utilise)
        return r.fulfill({
          status: 404,
          json: {
            ok: false,
            code: 'INTROUVABLE',
            message: 'Ce lien a expiré, votre estimation n’a pas pu être retrouvée.',
          },
        });
      utilise = true;
      return r.fulfill({
        json: {
          ok: true,
          data: brouillon({
            etape: 4,
            reponses: {
              surface: 70,
              pieces: 2,
              hauteur: 'std',
              etat: 'bon',
              extras: [],
              gamme: 'eco',
            },
          }),
        },
      });
    });
    await page.goto('/simulateur?reprise=jeton-de-test-abcdefghijklmnopqrstuvwxyz');
    await expect(page).toHaveURL(/prestation=peinture&etape=4/);
    await expect(page.getByText(/Estimation reprise/)).toBeVisible();
    await expect(encart(page)).toHaveCount(0);
    await expect(page.getByLabel('Code postal du chantier')).toHaveValue('33000');
    await expect(page.getByRole('complementary').getByText('70 m²')).toBeVisible();
    await expect.poll(() => lireStockage(page)).toContain('"surface":70');

    await page.goto('/simulateur?reprise=jeton-de-test-abcdefghijklmnopqrstuvwxyz');
    await expect(
      page.getByText('Ce lien a expiré, votre estimation n’a pas pu être retrouvée.'),
    ).toBeVisible();
  });
});
