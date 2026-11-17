import { expect, test, type Page } from '@playwright/test';
import { chemins } from '@ph/firebase/chemins';
import { admin, liensEnvoyes, MOT_DE_PASSE, PDF } from './outils';

// docs/ACCEPTANCE.md ONB-01 à 04 et ONB-07, sur les émulateurs et les SIREN du seed (cacheSirene).
const SIRENS = { libre: '552100554', fermee: '443061841', inscrite: '404833048' } as const;

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
  // Formulaire court (17/11/2026) : métier, code postal, email ; ni nom, ni téléphone, ni case.
  await page.goto('/pro');
  await page.getByLabel(/^Métier principal/).selectOption('couvreur');
  await page.getByLabel(/^Code postal/).fill('33700');
  await page.getByLabel(/^Email/).fill(email);
  await page.getByRole('button', { name: 'Voir les demandes de ma zone' }).click();
  await expect(page).toHaveURL(/\/pro\/inscription\/zone\?source=pro$/, { timeout: 15_000 });
}

const liensReprise = () => liensEnvoyes('/pro/inscription?reprise=');

/** Clé de Luhn : complète un numéro pour qu'il soit valide (SIREN 9 ou SIRET 14 chiffres). */
function avecCle(debut: string): string {
  for (let c = 0; c <= 9; c++) {
    const n = debut + c;
    let somme = 0;
    for (let i = 0; i < n.length; i++) {
      let x = Number(n[n.length - 1 - i]);
      if (i % 2 === 1) x = x * 2 > 9 ? x * 2 - 9 : x * 2;
      somme += x;
    }
    if (somme % 10 === 0) return n;
  }
  throw new Error('clé introuvable');
}
/** SIREN valide, au hasard (préfixe 9 : jamais dans le jeu de test). */
const sirenLibreAleatoire = () =>
  avecCle(`9${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`);
const siretValide = (siretSansCle: string) => avecCle(siretSansCle.slice(0, 13));

test.describe('Inscription pro', () => {
  test('LAND-01 : la source de la landing est gardée jusqu’au compte (brouillon d’inscription)', async ({
    page,
  }) => {
    const email = emailUnique('landing');
    await page.goto('/pro/trouver-des-chantiers?utm_source=google&utm_medium=cpc');
    await page.getByLabel(/^Métier principal/).selectOption('couvreur');
    await page.getByLabel(/^Code postal/).fill('33700');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByRole('button', { name: 'Voir les demandes près de chez moi' }).click();
    await expect(page).toHaveURL(/\/pro\/inscription\/zone\?source=trouver-chantier$/, {
      timeout: 15_000,
    });
    const { db } = await admin();
    const brouillons = await db
      .doc(chemins.brouillonOnboarding('_'))
      .parent.where('donnees.identite.email', '==', email)
      .get();
    expect(brouillons.docs[0]?.get('donnees.acquisition')).toMatchObject({
      source: 'trouver-chantier',
      utm_source: 'google',
      utm_medium: 'cpc',
    });
  });

  test('ONB-07, ONB-01 à 03 : bouton inactif tant que l’étape est incomplète, entreprise vérifiée, activation', async ({
    page,
  }, info) => {
    // Le SIREN libre ne sert qu'une fois : le parcours complet tourne sur le projet mobile.
    test.skip(info.project.name !== 'iphone-13', 'SIREN libre à usage unique');
    await simulerLieux(page);
    await etape1(page, emailUnique('onb'));

    // Ville proposée d'office d'après le code postal de l'étape 1 (33700), modifiable.
    const suivante = page.getByRole('button', { name: 'Étape suivante' });
    const ville = page.getByRole('combobox', { name: 'Votre ville' });
    await ville.fill('Mérig');
    await expect(suivante).toBeDisabled();
    await page.getByRole('option', { name: /Mérignac/ }).click();
    // Rayon au curseur (10 à 100 km, pas de 5) : 30 → 50 km ; le nombre de demandes suit le rayon.
    const rayon = page.getByLabel(/Rayon d.intervention/);
    const nombre = async () =>
      Number(
        (
          await page
            .getByText(/^Au moins \d+ demandes de travaux déposées ces dernières 48 h/)
            .first()
            .innerText()
        ).match(/Au moins (\d+)/)![1],
      );
    const a30 = await nombre();
    await rayon.focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
    await expect(rayon).toHaveValue('50');
    await expect.poll(nombre).toBeGreaterThan(a30);
    expect(a30).toBeGreaterThanOrEqual(3);
    // Phrase visible sans défiler sur téléphone ; pas d'« estimation » affichée.
    const phrase = page
      .getByText(
        /^Au moins \d+ demandes de travaux déposées ces dernières 48 h autour de Mérignac, dans un rayon de 50 km\.$/,
      )
      .first();
    await expect(phrase).toBeInViewport();
    await expect(page.getByText(/demandes estimées|demandes déposées ce mois/)).toHaveCount(0);
    await expect(suivante).toBeEnabled();
    await suivante.click();
    await expect(page).toHaveURL(/\/pro\/inscription\/compte$/);

    // Étape 3 : « Créez votre compte », plus de case des conditions (acceptées à l'étape 1).
    await expect(page.getByRole('heading', { level: 1, name: 'Créez votre compte' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /conditions générales/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Continuer avec Google' })).toBeVisible();
    await expect(
      page.getByText(/autour de Mérignac, dans un rayon de 50 km/).first(),
    ).toBeVisible();
    const activer = page.getByRole('button', { name: 'Activer mon espace' });
    await expect(activer).toBeDisabled();
    const recherche = page.getByLabel(/^Nom ou numéro SIREN/);
    const entreprises = page.getByRole('list', { name: 'Entreprises trouvées' });

    await recherche.fill(SIRENS.fermee);
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await expect(page.getByText('Cette entreprise est fermée')).toBeVisible();
    await expect(entreprises).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Je ne trouve pas mon entreprise' }),
    ).toBeVisible();

    await recherche.fill(SIRENS.inscrite);
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await expect(entreprises).toContainText('Cette entreprise a déjà un compte.');
    await expect(entreprises.getByRole('link', { name: 'Demander à rejoindre' })).toBeVisible();

    // Un seul résultat possible : sélectionné d'office.
    await recherche.fill(SIRENS.libre);
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await expect(entreprises).toContainText('SIREN 552 100 554');
    await expect(entreprises.getByRole('radio')).toBeChecked();
    // Email et mot de passe : le nom se demande ici (plus à l'étape 1).
    await page.getByLabel(/^Nom et prénom/).fill('Julien Bertrand');
    await page.getByLabel(/^Mot de passe/).fill(MOT_DE_PASSE);
    await expect(activer).toBeDisabled();
    await page.getByLabel(/^Confirmer le mot de passe/).fill(MOT_DE_PASSE);
    await expect(activer).toBeEnabled();
    await activer.click();
    await expect(page).toHaveURL(/\/pro\/tableau-de-bord/, { timeout: 15_000 });
    // ONB-06 (15/11/2026) : espace neuf → accueil avec le prénom, un seul bouton ; fiche en ligne
    // dès la fin de l'inscription (SIREN reconnu), assurance non vérifiée signalée.
    await expect(
      page.getByRole('heading', { level: 1, name: 'Bienvenue Julien, votre espace est prêt' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rédiger ma fiche avec l’IA' })).toBeVisible();
    await expect(page.getByText(/Votre fiche est en ligne/)).toBeVisible();
    await expect(page.getByText(/Assurance non vérifiée/)).toBeVisible();
    await expect(page.getByText('Demandes ce mois')).toHaveCount(0);
    await expect(page.getByText('3 étapes pour être en ligne')).toHaveCount(0);
    // Propriétaire : Mon compte (abonnement, équipe, aide) figure dans « Plus » (onglets mobiles).
    await page
      .getByRole('navigation', { name: 'Espace pro' })
      .getByRole('button', { name: 'Plus' })
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Plus' }).getByRole('link', { name: 'Mon compte' }),
    ).toBeVisible();

    // Ma fiche : en ligne, fiche incomplète ; l'attestation envoyée passe en vérification.
    await page.goto('/pro/fiche');
    await expect(page.getByRole('switch', { name: 'Fiche en ligne' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByText(/Pour compléter votre fiche : /)).toBeVisible();
    await expect(page.getByText(/Assurance non vérifiée/).first()).toBeVisible();
    await page.getByLabel('Type de document').selectOption('decennale');
    await page.getByLabel(/^Fichier/).setInputFiles(PDF);
    await page.getByRole('button', { name: 'Envoyer le document' }).click();
    await expect(page.getByRole('list', { name: 'Documents envoyés' })).toContainText(
      'En cours de vérification',
      { timeout: 15_000 },
    );
    // Prénom et nom saisis à l'étape compte dans le profil ; aucun téléphone demandé.
    const { db } = await admin();
    const artisanId = (
      await db.doc(chemins.artisan('_')).parent.where('siren', '==', SIRENS.libre).get()
    ).docs[0]!;
    expect(artisanId.get('sirenReconnu')).toMatchObject({ par: 'repertoire' });
    const profil = await db.doc(chemins.user(artisanId.get('proprietaireUid') as string)).get();
    expect(profil.data()).toMatchObject({ prenom: 'Julien', nom: 'Bertrand' });
  });

  test('« Je ne trouve pas mon entreprise » : saisie à la main, fiche hors ligne jusqu’à la vérification', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'ordinateur', 'un compte par passage suffit');
    await simulerLieux(page);
    await etape1(page, emailUnique('manuelle'));
    await page.getByRole('combobox', { name: 'Votre ville' }).fill('Mérig');
    await page.getByRole('option', { name: /Mérignac/ }).click();
    await page.getByRole('button', { name: 'Étape suivante' }).click();
    await expect(page).toHaveURL(/\/pro\/inscription\/compte$/);
    await page.getByLabel(/^Nom ou numéro SIREN/).fill('Entreprise introuvable zzz');
    // Répertoire simulé : aucun résultat.
    await page.route('**/api/pro/entreprise', (r) => r.fulfill({ json: { ok: true, data: [] } }));
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await page.getByRole('button', { name: 'Je ne trouve pas mon entreprise' }).click();
    await page.getByLabel(/^Nom de l’entreprise/).fill('Toitures Martin');
    await page.getByLabel(/^Adresse du siège/).fill('3 rue des Lilas');
    await page.getByLabel(/^Code postal/).fill('33700');
    await page.getByLabel(/^Ville/).fill('Mérignac');
    await page.getByLabel(/^Nom et prénom/).fill('Julien Bertrand');
    await page.getByLabel(/^Mot de passe/).fill(MOT_DE_PASSE);
    await page.getByLabel(/^Confirmer le mot de passe/).fill(MOT_DE_PASSE);
    // Le répertoire est réel : on tire un SIREN au hasard jusqu'à en trouver un qu'il ne connaît pas.
    let siren = '';
    for (let essai = 0; essai < 10 && !siren; essai++) {
      const candidat = sirenLibreAleatoire();
      const r = await page.request.post('/api/pro/entreprise', {
        data: { q: candidat },
        headers: { origin: new URL(page.url()).origin },
      });
      if (((await r.json()) as { data?: unknown[] }).data?.length === 0) siren = candidat;
    }
    expect(siren).not.toBe('');
    await page.getByLabel(/^Numéro SIRET/).fill(siretValide(siren + '00012'));
    await page.getByRole('button', { name: 'Activer mon espace' }).click();
    await expect(page).toHaveURL(/\/pro\/tableau-de-bord/, { timeout: 20_000 });
    await expect(page.getByText(/Votre fiche est hors ligne/)).toBeVisible();
    await page.goto('/pro/fiche');
    await expect(page.getByRole('switch', { name: 'Fiche en ligne' })).toHaveAttribute(
      'aria-checked',
      'false',
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
