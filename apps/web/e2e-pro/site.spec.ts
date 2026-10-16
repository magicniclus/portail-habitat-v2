import { chemins } from '@ph/firebase/chemins';
import { expect, test, type Page } from '@playwright/test';
import { admin, COMPTES, connecter, entrepriseDe } from './outils';

// docs/SITE_INTERNET.md §8 : SITE-03, SITE-07, SITE-08, SITE-09, SITE-10, SITE-11, SITE-13
// (SITE-12 : Turnstile refusé → aucune demande, couvert par tests/sites.test.ts).
const SLUG = 'proprio-e2e-site';
const URL_SITE = `http://${SLUG}.localhost:3200`;

/** Repart d'un compte sans site : documents du site et index d'adresse supprimés. */
async function sansSite() {
  const { db } = await admin();
  const id = await entrepriseDe(COMPTES.proprio);
  const site = await db.doc(chemins.site(id)).get();
  const slug = site.get('sousDomaine') as string | undefined;
  await db.recursiveDelete(db.doc(chemins.site(id)));
  for (const s of new Set([slug, SLUG].filter(Boolean) as string[])) {
    await db.doc(chemins.slugSite(s)).delete();
    await db.doc(chemins.domaineSite(`${s}.localhost`)).delete();
  }
  return id;
}

/** Offre du site (écrite par le webhook Stripe en production). */
async function offre(o: 'gratuit' | 'site_pro') {
  const { db } = await admin();
  await db.doc(chemins.site(await entrepriseDe(COMPTES.proprio))).update({ offre: o });
}

/** Création commencée en aperçu gratuit (accueil générée), en attente de Site Pro. */
async function creationEnAttente(id: string) {
  const { db } = await admin();
  await db.doc(chemins.creationIaSite(id)).set({
    schemaVersion: 1,
    statut: 'attente_paiement',
    reponses: { q2: 'Particuliers' },
    plan: [{ cle: 'accueil', nom: 'Accueil', remplace: 'accueil', consigne: 'e2e' }],
    faites: ['accueil'],
    apercu: [
      {
        op: 'remplacerContenuPage',
        cible: 'accueil',
        sections: [
          {
            p: { nom: 'Bandeau' },
            rows: [
              {
                cols: [
                  { w: 12, els: [{ type: 'titre', p: { texte: 'Accueil IA e2e', niveau: 'h1' } }] },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
}

async function publier(page: Page) {
  await page.getByRole('button', { name: 'Publier', exact: true }).click();
}

test.describe('Site internet artisan', () => {
  // Cache de 30 s des sites publiés : une publication peut mettre jusqu'à une minute (SITE-08).
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test('création, édition, publication (SITE-08), lien invalide bloquant (SITE-09)', async ({
    page,
  }) => {
    await sansSite();
    await connecter(page, COMPTES.proprio, '/pro/site');
    await page.getByLabel(/^Adresse de votre site/).fill(SLUG);
    await page.getByRole('button', { name: 'Créer mon site' }).click();
    await expect(page.getByRole('link', { name: 'Pages' })).toBeVisible();
    await expect(page.getByText('Pas encore publié')).toBeVisible();

    await page.getByRole('link', { name: 'Ouvrir l’éditeur' }).click();
    await expect(page).toHaveURL(/\/pro\/site\/editeur/);
    await page
      .getByRole('button', { name: /^Titre/ })
      .first()
      .click();
    await page.getByLabel('Texte', { exact: true }).fill('Votre plombier de confiance e2e');
    const apercu = page.frameLocator('iframe[title="Aperçu de la page"]');
    await expect(
      apercu.getByRole('heading', { name: 'Votre plombier de confiance e2e' }),
    ).toBeVisible();

    // SITE-09 : un bouton vers une adresse non https bloque la publication avec un message clair.
    await page.getByRole('button', { name: '← Calques' }).click();
    await page
      .getByRole('button', { name: /^Bouton/ })
      .first()
      .click();
    await page.getByLabel('Au clic').selectOption('url');
    await page.getByLabel('Adresse (https://…)').fill('http://exemple.fr');
    await expect(page.getByText('Adresse https:// obligatoire')).toBeVisible();
    await publier(page);
    await expect(page.getByText(/^Publication impossible/)).toBeVisible();

    await page.getByLabel('Adresse (https://…)').fill('https://exemple.fr');
    await publier(page);
    await expect(page.getByText(/Site publié/)).toBeVisible();

    // SITE-08 : visible sur son adresse en moins d'une minute.
    await expect(async () => {
      const r = await page.goto(`${URL_SITE}/`);
      expect(r?.status()).toBe(200);
      await expect(
        page.getByRole('heading', { name: 'Votre plombier de confiance e2e' }),
      ).toBeVisible({
        timeout: 1000,
      });
    }).toPass({ timeout: 60_000 });
  });

  test('SITE-07 : aucun cookie ; SITE-10 : menu mobile plein écran', async ({ page }) => {
    // Le jeu de test pose un choix cookies sur localhost : on part d'un navigateur vierge.
    await page.context().clearCookies();
    await page.setViewportSize({ width: 390, height: 800 });
    const reponse = await page.goto(`${URL_SITE}/`);
    expect(reponse?.status()).toBe(200);
    expect(reponse?.headers()['set-cookie']).toBeUndefined();
    expect(await page.evaluate(() => document.cookie)).toBe('');
    expect(await page.context().cookies(URL_SITE)).toEqual([]);

    const menu = page.locator('#menu');
    await expect(menu).toBeHidden();
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
    await expect(menu).toBeVisible();
    const boite = await menu.boundingBox();
    expect(boite?.width).toBeGreaterThanOrEqual(389);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
      'hidden',
    );
    await page.getByRole('button', { name: 'Fermer le menu' }).click();
    await expect(menu).toBeHidden();
  });

  test('SITE-03 : envoi du formulaire → « Mes demandes » ; SITE-13 : champ en trop rejeté', async ({
    page,
  }) => {
    await page.goto(`${URL_SITE}/`);
    await offre('gratuit');
    const formulaire = page.locator('[data-formulaire]').first();
    await formulaire.getByLabel(/^Nom et prénom/).fill('Lucie Site');
    await formulaire.getByLabel(/^Téléphone/).fill('0612345678');
    await formulaire.getByLabel(/^Email/).fill('lucie.site@test.local');
    await formulaire.getByLabel(/^Code postal du chantier/).fill('33000');
    await formulaire.getByRole('button').click();
    await expect(formulaire.getByText(/votre demande est envoyée/)).toBeVisible();

    const { db } = await admin();
    await expect(async () => {
      const d = await db
        .doc(chemins.demande('_'))
        .parent.where('contact.email', '==', 'lucie.site@test.local')
        .get();
      expect(d.docs.map((x) => x.get('source'))).toContain('site_artisan');
    }).toPass({ timeout: 10_000 });

    // SITE-13 : site gratuit, un champ qui n'est pas dans le formulaire standard est refusé.
    const statut = await page.evaluate(async () => {
      const r = await fetch('/api/sites/demande', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valeurs: {
            nom: 'Robot Champ',
            telephone: '0612345679',
            email: 'robot.champ@test.local',
            codePostal: '33000',
            budget: '10000',
          },
          jeton: '',
          page: '/',
        }),
      });
      return r.status;
    });
    expect(statut).toBe(400);
  });

  test('SITE-11 : la navigation enregistrée s’applique à toutes les pages', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/site/editeur');
    await page.getByRole('button', { name: 'Navigation', exact: true }).click();
    await page.getByLabel('Nom affiché').fill('Proprio Nav e2e');
    await expect(page.getByText('Navigation non enregistrée.')).toBeVisible();
    await page.getByRole('button', { name: 'Enregistrer la navigation' }).click();
    await expect(page.getByText(/Navigation enregistrée/)).toBeVisible();
    await publier(page);
    await expect(page.getByText(/Site publié/)).toBeVisible();
    await expect(async () => {
      for (const chemin of ['/', '/contact-devis']) {
        await page.goto(`${URL_SITE}${chemin}`);
        await expect(page.locator('header .marque')).toHaveText('Proprio Nav e2e', {
          timeout: 1000,
        });
      }
    }).toPass({ timeout: 60_000 });
  });

  test('DOM-02 : domaine sans Site Pro → fenêtre d’offre ; DOM-04 : tableau des enregistrements', async ({
    page,
  }) => {
    await offre('gratuit');
    await connecter(page, COMPTES.proprio, '/pro/site?onglet=domaine');
    await page.getByRole('button', { name: 'Utiliser mon domaine' }).click();
    await expect(page.getByRole('dialog')).toContainText('Site Pro');
    await expect(page.getByRole('link', { name: 'Continuer vers le paiement' })).toHaveAttribute(
      'href',
      '/pro/abonnement?offre=site',
    );

    // Site Pro (droits écrits par le webhook en production) : connexion d'un domaine existant.
    await offre('site_pro');
    try {
      await page.goto('/pro/site?onglet=domaine');
      await page.getByLabel(/^Votre domaine/).fill('https://www.exemple-e2e.fr/');
      await page.getByRole('button', { name: 'Connecter mon domaine' }).click();
      const lignes = page.getByRole('list', { name: 'Enregistrements DNS' }).getByRole('listitem');
      await expect(lignes).toHaveCount(3);
      await expect(page.getByText('exemple-e2e.fr', { exact: true })).toBeVisible();
      await expect(lignes.filter({ hasText: '_portailhabitat' })).toContainText('ph-verif=');
      await expect(lignes.filter({ hasText: 'En attente' })).toHaveCount(3);
      await page.getByRole('button', { name: 'Retirer ce domaine' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Retirer' }).click();
      await expect(page.getByRole('button', { name: 'Connecter mon domaine' })).toBeVisible();
    } finally {
      await offre('gratuit');
    }
  });

  test('statistiques sans cookie : visites et demandes du site dans l’onglet Statistiques', async ({
    page,
  }) => {
    await page.goto(`${URL_SITE}/`);
    await page.goto(`${URL_SITE}/contact-devis`);
    // Seul le choix cookies posé par le jeu de test (sur localhost) est présent : le site n'en pose aucun.
    const cookies = await page.context().cookies(URL_SITE);
    expect(cookies.filter((c) => c.name !== 'ph_consentement')).toEqual([]);
    await connecter(page, COMPTES.proprio, '/pro/site?onglet=stats');
    await expect(async () => {
      await page.reload();
      const visites = page.locator('text=Visites').first().locator('..').locator('strong');
      expect(Number((await visites.textContent())?.replace(/\D/g, ''))).toBeGreaterThan(0);
    }).toPass({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Pages les plus vues' })).toBeVisible();
    await expect(page.getByText('Visites par jour')).toBeVisible();
  });

  test('panneau IA : demande sans clé configurée → message clair, rien n’est modifié', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/site/editeur?panneau=ia');
    await expect(page.getByLabel('Que voulez-vous faire ?')).toBeVisible();
    await page.getByLabel(/^Demandez à l’IA/).fill('Plus court et plus chaleureux');
    await page.getByRole('button', { name: 'Proposer' }).click();
    await expect(page.getByText('L’assistant du site n’est pas encore disponible.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Proposition' })).toHaveCount(0);
  });

  test('SITE-IA-07 : fiche reprise, une question à la fois, 6 au plus ; sans clé → message clair', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/site/editeur?creation=1');
    await expect(page.getByRole('heading', { name: 'J’ai repris de votre fiche' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /^Métier :/ })).toBeChecked();
    await page.getByRole('checkbox', { name: /^Ville :/ }).uncheck();
    await page.getByRole('button', { name: 'Commencer' }).click();
    const compteur = page.getByText(/^Question 1 sur \d+$/);
    await expect(compteur).toBeVisible();
    const total = Number((await compteur.textContent())!.match(/sur (\d+)/)![1]);
    // 6 questions au plus, plus la question des pages locales quand le rayon dépasse 10 km.
    expect(total).toBeLessThanOrEqual(7);
    // Le métier et la ville viennent de la fiche : jamais redemandés.
    await expect(page.getByText(/Quel est votre métier|Dans quelle ville/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('button', { name: 'Particuliers' }).click();
    await expect(page.getByText(`Question 3 sur ${total}`)).toBeVisible();
    for (let i = 3; i <= total; i++) await page.getByRole('button', { name: 'Passer' }).click();
    await expect(page.getByText('L’assistant du site n’est pas encore disponible.')).toBeVisible();
    await page.getByRole('button', { name: 'Fermer' }).click();
    await expect(page.getByRole('navigation', { name: 'Panneaux' })).toBeVisible();
  });

  test('SITE-IA-01 : aperçu gratuit de l’accueil, filigrane, Publier désactivé, offre Site Pro', async ({
    page,
  }) => {
    const { db } = await admin();
    const id = await entrepriseDe(COMPTES.proprio);
    const artisan = db.doc(chemins.artisan(id));
    const formule = (await artisan.get()).get('droits.formule') as string;
    await artisan.update({ 'droits.formule': 'gratuit' });
    await creationEnAttente(id);
    try {
      await connecter(page, COMPTES.proprio, '/pro/site/editeur');
      await expect(page.getByText(/^Aperçu de votre page d’accueil créée par l’IA/)).toBeVisible();
      await expect(page.locator('[data-filigrane]')).toHaveText('Aperçu');
      await expect(page.getByRole('button', { name: 'Publier', exact: true })).toBeDisabled();
      const apercu = page.frameLocator('iframe[title="Aperçu de la page"]');
      await expect(apercu.getByRole('heading', { name: 'Accueil IA e2e' })).toBeVisible();
      await page.getByRole('button', { name: 'Activer Site Pro' }).click();
      await expect(page.getByRole('link', { name: 'Continuer vers le paiement' })).toHaveAttribute(
        'href',
        '/pro/abonnement?offre=site',
      );
      await page.getByRole('button', { name: 'Plus tard' }).click();
      // Fermer l'aperçu : le brouillon n'a pas changé, la publication redevient possible.
      await page.getByRole('button', { name: 'Fermer l’aperçu' }).click();
      await expect(page.locator('[data-filigrane]')).toHaveCount(0);
      await expect(apercu.getByRole('heading', { name: 'Accueil IA e2e' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Publier', exact: true })).toBeEnabled();
    } finally {
      await artisan.update({ 'droits.formule': formule });
    }
  });

  test('SITE-IA-02 : Site Pro actif → reprise proposée sans question ; Mes modèles', async ({
    page,
  }) => {
    const { db } = await admin();
    const id = await entrepriseDe(COMPTES.proprio);
    await creationEnAttente(id);
    await connecter(page, COMPTES.proprio, '/pro/site/editeur');
    await expect(page.getByRole('button', { name: 'Reprendre la création' })).toBeVisible();
    await page.getByRole('button', { name: 'Reprendre la création' }).click();
    await expect(page.getByText('L’assistant du site n’est pas encore disponible.')).toBeVisible();
    await expect(page.getByText(/^Question \d/)).toHaveCount(0);
    await db.doc(chemins.creationIaSite(id)).delete();

    // SITE-IA-09 : « Avant IA – date » restaurable depuis Mes modèles.
    await db.doc(chemins.modeleSite(id, 'avant-ia-e2e')).set({
      schemaVersion: 1,
      nom: 'Avant IA – e2e',
      type: 'avant_ia',
      pages: (await db.doc(chemins.pageSite(id, '_')).parent.get()).docs.reduce(
        (acc, d) => ({ ...acc, [d.id]: d.data() }),
        {},
      ),
      navigation: null,
      theme: null,
      createdAt: new Date(),
    });
    await page.goto('/pro/site/editeur?panneau=modeles');
    await expect(page.getByRole('heading', { name: 'Mes modèles' })).toBeVisible();
    const ligne = page.getByRole('listitem').filter({ hasText: 'Avant IA – e2e' });
    await ligne.getByRole('button', { name: 'Restaurer' }).click();
    await expect(page.getByText(/« Avant IA – e2e » restauré/)).toBeVisible();
  });
});
