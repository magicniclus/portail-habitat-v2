import { chemins, collections } from '@ph/firebase/chemins';
import { expect, test, type Page } from '@playwright/test';
import { admin, COMPTES, connecter, entrepriseDe, png } from './outils';

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
    // Maquette Editeur de Site : un clic sur la page sélectionne le contenu, réglé à droite.
    const apercu = page.frameLocator('iframe[title="Aperçu de la page"]');
    await apercu.locator('h1').first().click();
    await expect(page.getByRole('heading', { name: 'Titre', level: 2, exact: true })).toBeVisible();
    await page.getByLabel('Texte', { exact: true }).fill('Votre plombier de confiance e2e');
    await expect(
      apercu.getByRole('heading', { name: 'Votre plombier de confiance e2e' }),
    ).toBeVisible();

    // SITE-09 : un bouton vers une adresse non https bloque la publication avec un message clair.
    await apercu.getByRole('link', { name: 'Demander un devis gratuit' }).first().click();
    await expect(
      page.getByRole('heading', { name: 'Bouton', level: 2, exact: true }),
    ).toBeVisible();
    // Action en tuiles (maquette) : Lien web.
    await page
      .getByRole('radiogroup', { name: 'Action', exact: true })
      .getByRole('radio', { name: 'Lien web' })
      .click();
    await page.getByLabel('Adresse du site').fill('http://exemple.fr');
    await expect(page.getByText('Adresse https:// obligatoire')).toBeVisible();
    await publier(page);
    await expect(page.getByText(/^Publication impossible/)).toBeVisible();

    await page.getByLabel('Adresse du site').fill('https://exemple.fr');
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
    // Le formulaire public est limité à 5 envois par heure et par IP, et tous les projets
    // Playwright partagent la même IP : le compteur repart de zéro pour ce test.
    const { db } = await admin();
    await db.recursiveDelete(db.doc(`${collections.rateLimits}/_`).parent);
    await page.goto(`${URL_SITE}/`);
    await offre('gratuit');
    const formulaire = page.locator('[data-formulaire]').first();
    await formulaire.getByLabel(/^Nom et prénom/).fill('Lucie Site');
    await formulaire.getByLabel(/^Téléphone/).fill('0612345678');
    await formulaire.getByLabel(/^Email/).fill('lucie.site@test.local');
    await formulaire.getByLabel(/^Code postal du chantier/).fill('33000');
    await formulaire.getByRole('button').click();
    await expect(formulaire.getByText(/votre demande est envoyée/)).toBeVisible();

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
    // Navigation, composant global : sélectionnée depuis la structure.
    await page.getByRole('button', { name: 'Navigation · globale' }).click();
    await page.getByLabel('Nom affiché').fill('Proprio Nav e2e');
    await expect(page.getByText('Navigation non enregistrée')).toBeVisible();
    await page.getByRole('button', { name: 'Enregistrer la navigation' }).click();
    await expect(page.getByText(/Navigation enregistrée/)).toBeVisible();
    await publier(page);
    await expect(page.getByText(/Site publié/)).toBeVisible();
    await expect(async () => {
      for (const chemin of ['/', '/contact-devis']) {
        await page.goto(`${URL_SITE}${chemin}`);
        await expect(page.locator('header a.marque .nom')).toHaveText('Proprio Nav e2e', {
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
    await expect(page.getByRole('button', { name: 'Continuer vers le paiement' })).toBeEnabled();

    // Site Pro (droits écrits par le webhook en production) : connexion d'un domaine existant.
    await offre('site_pro');
    try {
      await page.goto('/pro/site?onglet=domaine');
      await page.getByLabel(/^Votre domaine/).fill('https://www.exemple-e2e.fr/');
      await page.getByRole('button', { name: 'Connecter mon domaine' }).click();
      const lignes = page.getByRole('list', { name: 'Enregistrements DNS' }).getByRole('listitem');
      await expect(lignes).toHaveCount(3);
      await expect(page.getByText('exemple-e2e.fr', { exact: true })).toBeVisible();
      await expect(lignes.filter({ hasText: '_portailtravaux' })).toContainText('ph-verif=');
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
    // Site Pro : l'IA choisit l'action par défaut ; demandes restantes du mois affichées.
    await expect(page.getByLabel('Que voulez-vous faire ?')).toHaveValue('auto');
    await expect(
      page.getByText(/^Ce mois-ci : \d+ retouches de texte et \d+ sections ou pages restantes$/),
    ).toBeVisible();
    // Modération : dénigrement d'un concurrent refusé avant tout appel.
    await page.getByLabel(/^Demandez à l’IA/).fill('Écris que nos concurrents sont des escrocs');
    await page.getByRole('button', { name: 'Proposer' }).click();
    await expect(page.getByText(/ne peut pas écrire de critique d’un concurrent/)).toBeVisible();
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
    await page.getByRole('button', { name: 'Fermer', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Outils de l’éditeur' })).toBeVisible();
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
      await expect(page.getByRole('button', { name: 'Continuer vers le paiement' })).toBeEnabled();
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
    await page.getByRole('tab', { name: 'Mes modèles' }).click();
    await expect(page.getByRole('heading', { name: 'Mes modèles' })).toBeVisible();
    const ligne = page.getByRole('listitem').filter({ hasText: 'Avant IA – e2e' });
    await ligne.getByRole('button', { name: 'Restaurer' }).click();
    await expect(page.getByText(/« Avant IA – e2e » restauré/)).toBeVisible();
  });

  test('Ajouter et structure : zone prête (une étape d’historique), contenu dans la sélection, dupliquer et supprimer', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/site/editeur?panneau=ajouter');
    const apercu = page.frameLocator('iframe[title="Aperçu de la page"]');
    await page.getByRole('tab', { name: 'Zones' }).click();
    await page.getByRole('button', { name: /^Appel à l’action/ }).click();
    await expect(apercu.getByRole('heading', { name: 'Un projet ? Parlons-en.' })).toBeVisible();
    await page.getByRole('button', { name: 'Annuler (Ctrl Z)' }).click();
    await expect(apercu.getByRole('heading', { name: 'Un projet ? Parlons-en.' })).toHaveCount(0);

    // Contenu : placé après le contenu sélectionné, ses réglages s'ouvrent à droite.
    await page.getByRole('tab', { name: 'Contenus' }).click();
    // Sans sélection : le contenu part dans une nouvelle zone en bas de la page.
    await page.getByRole('button', { name: 'Chiffre clé', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Chiffre clé', level: 2, exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Annuler (Ctrl Z)' }).click();
    await apercu.locator('h1').first().click();
    await page.getByRole('button', { name: 'Chiffre clé', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Chiffre clé', level: 2, exact: true }),
    ).toBeVisible();

    // Échap remonte au bloc, à la section puis à la zone ; dupliquer puis supprimer la zone.
    for (const niveau of ['Bloc 1', 'Section 1']) {
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('heading', { name: niveau, level: 2, exact: true }),
      ).toBeVisible();
    }
    await page.keyboard.press('Escape');
    const zone = (await page.getByRole('heading', { level: 2 }).last().textContent())!;
    await page.getByRole('button', { name: 'Structure', exact: true }).click();
    const structure = page.getByRole('complementary', { name: 'Structure' });
    await expect(structure.getByRole('button', { name: zone, exact: true })).toHaveCount(1);
    await page.getByRole('button', { name: 'Dupliquer (Ctrl D)' }).click();
    await expect(structure.getByRole('button', { name: zone, exact: true })).toHaveCount(2);
    await page.getByRole('button', { name: 'Supprimer (Suppr)' }).click();
    await expect(structure.getByRole('button', { name: zone, exact: true })).toHaveCount(1);
  });

  test('copier-coller (Ctrl C / Ctrl V) et glisser-déposer dans la structure', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/site/editeur');
    const structure = page.getByRole('complementary', { name: 'Structure' });
    const zones = structure.getByRole('listitem');
    const premiere = zones.nth(1);
    const nom = (await premiere.textContent())!.trim();
    await premiere.getByRole('button').click();
    await page.keyboard.press('Control+c');
    await expect(page.getByRole('status').filter({ hasText: 'Copié' })).toBeVisible();
    await page.keyboard.press('Control+v');
    await expect(structure.getByRole('button', { name: nom, exact: true })).toHaveCount(2);
    // La copie (sélectionnée, juste après) glisse tout en haut : avant la première zone.
    const n = await zones.count();
    await zones.nth(2).dragTo(zones.nth(1), { targetPosition: { x: 20, y: 4 } });
    await expect(page.getByRole('status').filter({ hasText: 'Déplacé' })).toBeVisible();
    expect(await zones.count()).toBe(n);
    await page.getByRole('button', { name: 'Annuler (Ctrl Z)' }).click();
    await page.getByRole('button', { name: 'Annuler (Ctrl Z)' }).click();
    await expect(structure.getByRole('button', { name: nom, exact: true })).toHaveCount(1);
  });

  test('SITE-02 : un réglage mobile (texte, masquage) est sans effet sur l’ordinateur', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/site/editeur');
    const apercu = page.frameLocator('iframe[title="Aperçu de la page"]');
    await apercu.locator('h1').first().click();
    await page.getByRole('tab', { name: 'Avancé' }).click();
    await page.getByRole('switch', { name: 'Texte différent sur mobile' }).click();
    await page.getByLabel('Texte affiché sur mobile').fill('Titre mobile e2e');
    const mobile = apercu.getByText('Titre mobile e2e');
    await expect(mobile).toBeHidden();
    await page
      .getByRole('group', { name: 'Appareil' })
      .getByRole('button', { name: 'Mobile' })
      .click();
    await expect(mobile).toBeVisible();

    // Masqué sur mobile seulement : toujours là sur ordinateur.
    await page.getByRole('switch', { name: 'Masquer sur mobile' }).click();
    await expect(mobile).toBeHidden();
    await page
      .getByRole('group', { name: 'Appareil' })
      .getByRole('button', { name: 'Ordinateur' })
      .click();
    await expect(apercu.getByRole('heading').first()).toBeVisible();
  });

  test('mots liés : texte sélectionné, bouton Lien puis une action ; le mot devient un lien dans l’aperçu', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/site/editeur?panneau=ajouter');
    await page.frameLocator('iframe[title="Aperçu de la page"]').locator('h1').first().click();
    await page.getByRole('button', { name: 'Texte', exact: true }).click();
    const zone = page.getByRole('textbox', { name: 'Texte', exact: true });
    await expect(zone).toHaveText('Votre texte.');
    // Sélection des mots « texte » dans l'éditeur de texte, puis le bouton Lien de sa barre.
    await zone.evaluate((z) => {
      const r = document.createRange();
      r.setStart(z.firstChild!, 6);
      r.setEnd(z.firstChild!, 11);
      getSelection()!.removeAllRanges();
      getSelection()!.addRange(r);
    });
    await page
      .getByRole('toolbar', { name: 'Mise en forme' })
      .getByRole('button', { name: 'Lien' })
      .click();
    await expect(zone.locator('a')).toHaveText('texte');
    await page
      .getByRole('radiogroup', { name: 'Lien « texte »' })
      .getByRole('radio', { name: 'Appel' })
      .click();
    await page.getByLabel('Numéro à appeler').fill('0556000000');
    const lien = page.frameLocator('iframe[title="Aperçu de la page"]').locator('a[href^="tel:"]', {
      hasText: 'texte',
    });
    await expect(lien).toBeVisible();
    await page.getByRole('button', { name: 'Retirer le lien « texte »' }).click();
    await expect(zone.locator('a')).toHaveCount(0);
    await expect(zone).toHaveText('Votre texte.');
  });

  test('aperçu cliquable : un lien du menu change de page ; formulaire en fenêtre', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/site/editeur');
    // Bouton devis de la navigation : action Formulaire, affichée en fenêtre.
    await page.getByRole('button', { name: 'Navigation · globale' }).click();
    const action = page.getByRole('radiogroup', { name: 'Action du bouton' });
    await action.getByRole('radio', { name: 'Formulaire' }).click();
    await page
      .getByRole('radiogroup', { name: 'Affichage' })
      .getByRole('radio', { name: 'Fenêtre' })
      .click();
    await expect(page.getByText('Les demandes arrivent dans « Mes demandes ».')).toBeVisible();

    await page.getByRole('button', { name: 'Aperçu', exact: true }).click();
    const apercu = page.frameLocator('iframe[title="Aperçu de la page"]');
    await apercu.locator('header a.cta:visible').first().click();
    await expect(apercu.getByRole('dialog', { name: 'Votre demande de devis' })).toBeVisible();
    await apercu.getByRole('button', { name: 'Fermer' }).click();
    await expect(apercu.getByRole('dialog')).toBeHidden();

    await apercu
      .locator('header a:visible', { hasText: /^Contact$/ })
      .first()
      .click();
    await expect(page.getByLabel('Page affichée')).toHaveValue('contact');
    await page.getByRole('button', { name: 'Quitter l’aperçu' }).click();
    await page.getByRole('button', { name: 'Annuler les modifications non enregistrées' }).click();
  });

  test('Mes zones : une zone enregistrée comme modèle réapparaît dans Ajouter › Zones', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/site/editeur');
    const structure = page.getByRole('complementary', { name: 'Structure' });
    // Première zone de la page (la navigation globale est en tête de la liste).
    await structure.getByRole('listitem').nth(1).getByRole('button').click();
    await page.getByRole('button', { name: '★ Enregistrer comme modèle de zone' }).click();
    const message = page.getByRole('status').filter({ hasText: 'ajoutée à Mes zones' });
    await expect(message).toBeVisible();
    const nom = (await message.textContent())!.match(/« (.+) »/)![1]!;
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.getByRole('tab', { name: 'Zones' }).click();
    const mes = page.getByRole('region', { name: 'Mes zones enregistrées' });
    await expect(mes.getByRole('button', { name: nom, exact: true })).toBeVisible();
    await mes.getByRole('button', { name: `Supprimer ${nom} de Mes zones` }).click();
    await expect(mes.getByRole('button', { name: nom, exact: true })).toHaveCount(0);
  });

  test('médiathèque : image importée dans l’éditeur puis choisie pour l’élément image', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/site/editeur?panneau=ajouter');
    await page.frameLocator('iframe[title="Aperçu de la page"]').locator('h1').first().click();
    await page.getByRole('button', { name: 'Image', exact: true }).click();
    await page.getByLabel('Importer une image').setInputFiles(png('chantier.png'));
    const importee = page.getByRole('radio', { name: /^Image importée/ });
    await expect(importee).toHaveCount(1);
    await expect(importee).toHaveAttribute('aria-checked', 'true');
    await expect(
      page.frameLocator('iframe[title="Aperçu de la page"]').locator('img[src*="sites%2F"]'),
    ).toHaveCount(1);
  });

  test('modèles de site : appliquer « Dépannage 24/7 » à tout le site, puis revenir', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/site/editeur?panneau=modeles');
    await expect(page.getByRole('heading', { name: 'Modèles de site' })).toBeVisible();
    await page.getByRole('button', { name: /^Dépannage 24\/7/ }).click();
    await page.getByRole('button', { name: 'Appliquer à tout le site' }).click();
    await expect(page.getByText(/Modèle « Dépannage 24\/7 » appliqué à \d+ pages/)).toBeVisible();
    await page.getByRole('button', { name: /^Minimal/ }).click();
    await page.getByRole('button', { name: 'Couleurs et polices seulement' }).click();
    await expect(
      page.getByText('Modèle « Minimal » appliqué (couleurs et polices).', { exact: false }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Revenir à l’état précédent' }).click();
    await expect(page.getByText('Site d’avant le modèle restauré.')).toBeVisible();
  });

  test('tableau de bord : une page retirée du menu puis dépubliée attend la publication', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/site');
    const carte = page.getByRole('listitem').filter({ hasText: 'Contact et devis' });
    const menu = carte.getByRole('switch', { name: /dans le menu/ });
    const avant = await menu.getAttribute('aria-checked');
    await menu.click();
    await expect(menu).toHaveAttribute('aria-checked', avant === 'true' ? 'false' : 'true');
    await carte.getByRole('button', { name: 'Dépublier' }).click();
    await expect(carte.getByRole('button', { name: 'Mettre en ligne' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Publier/ })).toBeVisible();
    // L'accueil reste toujours en ligne : pas de « Dépublier ».
    await expect(
      page
        .getByRole('listitem')
        .filter({ hasText: /^Accueil/ })
        .getByRole('button', { name: 'Dépublier' }),
    ).toHaveCount(0);
    await carte.getByRole('button', { name: 'Mettre en ligne' }).click();
    await menu.click();
  });
});
