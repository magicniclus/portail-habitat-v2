// Captures vidéo C1 à C8 de la VSL (découpage validé), sur la copie locale (émulateurs + décor).
// Usage : tsx scripts/vsl/captures.ts [bureau|mobile] [c1 c2 …]   (sans scène : toutes)
// Chaque scène écrit `.vsl/captures/{scène}-{format}/` (images horodatées) et une image de contrôle.
import type { Locator, Page } from '@playwright/test';
import { connecter, masquer, plateau, type Format, type Prise } from './tournage';

const SLUG_FICHE = 'bertrand-renovation-bordeaux';
const SLUG_SITE = 'bertrand-renovation';
const PORT = new URL(process.env.VSL_URL ?? 'http://localhost:3200').port || '3200';

/** Liste native : le curseur s'y pose, la valeur change (le menu natif n'est pas filmable). */
async function choisir(p: Prise, liste: Locator, valeur: string | { label: string }) {
  await p.survoler(liste, 600);
  await p.attendre(500);
  await liste.selectOption(valeur);
  await p.attendre(350);
}

async function ouvrir(page: Page, url: string, cacher: string[] = []) {
  await page.goto(url);
  await page.waitForLoadState('load');
  await masquer(page, cacher);
  await page.waitForTimeout(900);
}

type Scene = { pro: boolean; jouer: (p: Prise, page: Page) => Promise<void> };

const SCENES: Record<string, Scene> = {
  // C1 — Formulaire « Créer mon espace gratuit ». Les compteurs de demandes (chiffres hors liste
  // autorisée) sont masqués ; l'envoi est retenu pour que la prise se termine sur le clic.
  c1: {
    pro: false,
    jouer: async (p, page) => {
      await page.route('**/api/pro/inscription', async (route) => {
        await new Promise((r) => setTimeout(r, 90_000));
        await route.abort();
      });
      await ouvrir(page, '/pro/trouver-des-chantiers', [
        '#inscription [aria-live]',
        '#inscription h2 + p',
        '[data-barre-mobile]',
      ]);
      const f = page.locator('#inscription');
      if (p.format === 'mobile') await f.scrollIntoViewIfNeeded();
      await p.action('c1');
      await p.saisir(f.getByLabel(/^Nom et prénom/), 'Julien Bertrand');
      await p.saisir(f.getByLabel(/^Email/), 'contact@bertrand-renovation.fr', 40);
      await p.saisir(f.getByLabel(/^Téléphone/), '06 12 34 56 78', 45);
      await p.saisir(f.getByLabel(/^Code postal/), '33000', 70);
      await choisir(p, f.getByLabel(/^Métier principal/), { label: 'Plombier' });
      await p.cliquer(f.getByRole('checkbox', { name: /J.accepte/ }), 600);
      await p.attendre(300);
      await p.photo('c1');
      await p.cliquer(f.getByRole('button', { name: 'Voir les demandes près de chez moi' }), 700);
      await p.attendre(900);
      console.log(await p.coupez());
    },
  },

  // C2 — « Mes demandes » : la liste se charge, défilement lent, survol d'une demande.
  c2: {
    pro: true,
    jouer: async (p, page) => {
      await page.goto('/pro/tableau-de-bord');
      await masquer(page);
      await p.action('c2');
      await page.goto('/pro/demandes');
      await page.waitForLoadState('load');
      await masquer(page);
      await p.attendre(1200);
      await p.defiler(p.format === 'mobile' ? 1150 : 560, 2400);
      await p.attendre(300);
      await p.survoler(page.getByRole('heading', { name: 'Salle de bain' }), 900);
      await p.attendre(700);
      await p.photo('c2');
      console.log(await p.coupez());
    },
  },

  // C3 — Une demande en détail : chantier, ville, budget, délai visibles ensemble.
  c3: {
    pro: true,
    jouer: async (p, page) => {
      await ouvrir(page, '/pro/demandes');
      const carte = page.getByRole('listitem').filter({ hasText: 'PT-SDB33M' });
      await carte.evaluate((el) => {
        const haut = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, haut - (window.innerWidth < 600 ? 80 : 150));
      });
      await p.attendre(500);
      await p.action('c3');
      await p.survoler(carte.getByRole('heading', { name: 'Salle de bain' }), 900);
      await p.attendre(900);
      await p.survoler(carte.getByText('Mérignac (33700)'), 800);
      await p.attendre(700);
      await p.survoler(carte.getByText(/6\s?000/), 900);
      await p.attendre(700);
      await p.survoler(carte.getByText('Démarrage sous 1 mois'), 900);
      await p.attendre(900);
      await p.photo('c3');
      console.log(await p.coupez());
    },
  },

  // C4 — « Ma fiche » : rayon d'intervention porté de 20 à 50 km, ajout d'un second métier.
  c4: {
    pro: true,
    jouer: async (p, page) => {
      await ouvrir(page, '/pro/fiche');
      await p.action('c4');
      await p.cliquer(page.getByRole('button', { name: 'Modifier ma zone' }), 900);
      const feuille = page.getByRole('dialog');
      await feuille.waitFor();
      await p.attendre(500);
      await choisir(p, feuille.getByLabel("Rayon d'intervention"), '50');
      await p.photo('c4');
      await p.cliquer(feuille.getByRole('button', { name: 'Enregistrer' }), 600);
      await feuille.waitFor({ state: 'hidden' });
      await p.attendre(500);
      await p.cliquer(page.getByRole('button', { name: 'Ajouter un métier' }), 900);
      const metiers = page.getByRole('dialog');
      await metiers.waitFor();
      await p.attendre(500);
      await p.cliquer(metiers.getByRole('checkbox', { name: 'Carreleur' }), 900);
      await p.attendre(400);
      await p.cliquer(metiers.getByRole('button', { name: 'Enregistrer' }), 700);
      await metiers.waitFor({ state: 'hidden' });
      await p.attendre(1200);
      await p.photo('c4-metiers');
      console.log(await p.coupez());
    },
  },

  // Préparation (non filmée) : un devis type enregistré comme modèle, le site créé et publié.
  preparer: {
    pro: true,
    jouer: async (_p, page) => {
      await page.goto('/pro/devis?onglet=modeles');
      if (!(await page.getByRole('link', { name: 'Utiliser ce modèle' }).count())) {
        await page.goto('/pro/devis/nouveau');
        await page.getByLabel('Nom du client').fill('Client type');
        await page.getByLabel('Email du client').fill('client@exemple.fr');
        await page.getByLabel('Adresse du client').fill('3 rue des Lilas, 33700 Mérignac');
        await page.getByLabel('Objet du devis').fill('Salle de bain — douche à l’italienne');
        const lignes = [
          ['Dépose de la baignoire et évacuation des gravats', '1', '380'],
          ['Pose d’un receveur extra-plat 90 × 120', '1', '690'],
          ['Faïence murale grand format, pose collée', '12', '65'],
        ];
        for (const [i, [designation, quantite, prix]] of lignes.entries()) {
          if (i > 0) await page.getByRole('button', { name: 'Ligne simple' }).click();
          const ligne = page.getByRole('group', { name: `Ligne ${i + 1}` });
          await ligne.getByLabel('Désignation').fill(designation!);
          await ligne.getByLabel('Quantité').fill(quantite!);
          await ligne.getByLabel('PU HT (€)').fill(prix!);
        }
        await page.getByRole('button', { name: 'Valider', exact: true }).click();
        await page.waitForURL(/\/pro\/devis\/(?!nouveau)[^/]+$/, { timeout: 30_000 });
        await page.getByRole('button', { name: 'Enregistrer comme modèle' }).click();
        await page.getByText('Modèle enregistré').waitFor();
      }
      await page.goto('/pro/site');
      const creer = page.getByRole('button', { name: 'Créer mon site' });
      if (await creer.isVisible().catch(() => false)) {
        await page.getByLabel(/^Adresse de votre site/).fill(SLUG_SITE);
        await creer.click();
        await page.getByRole('link', { name: 'Ouvrir l’éditeur' }).first().waitFor();
      }
      await page.goto('/pro/site/editeur');
      await page.waitForTimeout(2500);
      await page.getByRole('button', { name: 'Publier', exact: true }).click({ timeout: 20_000 });
      await page.waitForTimeout(3000);
    },
  },

  // C5 — Devis : ouverture d'un modèle, ajout d'une ligne, validation (le client signe en ligne).
  c5: {
    pro: true,
    jouer: async (p, page) => {
      await ouvrir(page, '/pro/devis?onglet=modeles');
      await p.action('c5');
      await p.attendre(500);
      await p.cliquer(page.getByRole('link', { name: 'Utiliser ce modèle' }).first(), 900);
      await page.waitForURL(/devis\/nouveau/);
      await page.waitForLoadState('load');
      await masquer(page);
      // Client du devis posé d'un coup (hors du passage monté) : mentions complètes à l'écran.
      await page.getByLabel('Nom du client').fill('Claire Martin');
      await page.getByLabel('Email du client').fill('claire@exemple.fr');
      await page.getByLabel('Adresse du client').fill('3 rue des Lilas, 33700 Mérignac');
      await p.attendre(900);
      await p.photo('c5-modele');
      await p.cliquer(page.getByRole('button', { name: 'Ligne simple' }), 900);
      const ligne = page.getByRole('group', { name: 'Ligne 4' });
      await p.saisir(
        ligne.getByLabel('Désignation'),
        'Mitigeur thermostatique et colonne de douche',
        22,
      );
      await ligne.getByLabel('Quantité').fill('1');
      await p.saisir(ligne.getByLabel('PU HT (€)'), '245', 70);
      await p.attendre(600);
      await p.photo('c5');
      await p.survoler(page.getByRole('button', { name: 'Valider', exact: true }), 900);
      await p.attendre(900);
      console.log(await p.coupez());
    },
  },

  // C6 — Le site internet de l'artisan, en ligne : défilement du haut de page.
  c6: {
    pro: false,
    jouer: async (p, page) => {
      await ouvrir(page, `http://${SLUG_SITE}.localhost:${PORT}/`);
      await p.action('c6');
      await p.attendre(900);
      await p.photo('c6');
      await p.defiler(p.format === 'mobile' ? 1400 : 900, 2800);
      await p.attendre(500);
      console.log(await p.coupez());
    },
  },

  // C7 — Avis clients puis suivi clients (2 s chacun). Les avis eux-mêmes ne sont pas montrés.
  c7: {
    pro: true,
    jouer: async (p, page) => {
      await ouvrir(page, '/pro/avis');
      // Les avis du jeu de test (noms et textes fictifs) restent hors champ : seule l'interface.
      await page
        .locator('main')
        .getByRole('list')
        .last()
        .evaluate((el) => (el.style.visibility = 'hidden'));
      await p.action('c7-avis');
      await p.survoler(page.getByRole('button', { name: 'Demander un avis' }), 1100);
      await p.attendre(1100);
      await p.photo('c7-avis');
      console.log(await p.coupez());
      await ouvrir(page, '/pro/demandes');
      await p.action('c7-suivi');
      await p.cliquer(page.getByRole('button', { name: /Devis envoyé/ }).first(), 900);
      await p.defiler(p.format === 'mobile' ? 900 : 420, 1200);
      await p.attendre(600);
      await p.photo('c7-suivi');
      console.log(await p.coupez());
    },
  },

  // C8 — Fiche publique de l'artisan sur le portail.
  c8: {
    pro: false,
    jouer: async (p, page) => {
      await ouvrir(page, `/artisans/${SLUG_FICHE}`);
      await p.attendre(800);
      await p.action('c8');
      await p.attendre(700);
      await p.photo('c8');
      await p.defiler(p.format === 'mobile' ? 900 : 520, 2400);
      await p.attendre(500);
      console.log(await p.coupez());
    },
  },

  // Film « site internet » (après decor-site.ts et site-modele.ts) : l'éditeur, puis le site publié.
  // S1 — Le site créé, parcouru dans l'éditeur.
  's-editeur': {
    pro: true,
    jouer: async (p, page) => {
      await ouvrir(page, '/pro/site/editeur');
      await p.vers(1500, 950, 300);
      await p.action('s-editeur');
      await p.attendre(700);
      // La molette ne traverse pas le cadre de l'aperçu : on fait défiler ce qui défile vraiment
      // (le document du cadre, sinon son conteneur), pas à pas, sur l'horloge.
      const cadre = page.frames().find((x) => x.url() === 'about:srcdoc')!;
      const dansCadre = await cadre.evaluate(
        () => document.documentElement.scrollHeight > window.innerHeight + 50,
      );
      const total = 5200 * p.tempo;
      const debut = Date.now();
      for (let k = 0; k < 1;) {
        k = Math.min(1, (Date.now() - debut) / total);
        const y = Math.round(3200 * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2));
        if (dansCadre) await cadre.evaluate((v) => window.scrollTo(0, v), y);
        else
          await page
            .locator('iframe')
            .first()
            .evaluate((el, v) => {
              let c: HTMLElement | null = el.parentElement;
              while (c && c.scrollHeight <= c.clientHeight + 50) c = c.parentElement;
              c?.scrollTo(0, v);
            }, y * 0.45);
        await page.waitForTimeout(12);
      }
      await p.attendre(500);
      await p.photo('s-editeur');
      console.log(await p.coupez());
    },
  },
  // S2 — Modifier un titre en cliquant dessus, puis voir le rendu téléphone ; le site est enregistré.
  's-modifier': {
    pro: true,
    jouer: async (p, page) => {
      await ouvrir(page, '/pro/site/editeur');
      const site = page.frameLocator('iframe').first();
      await p.action('s-modifier');
      await p.cliquer(site.getByText('plombier à Bordeaux').first(), 900);
      await p.attendre(500);
      const champ = page.locator('[contenteditable=true]').first();
      await p.cliquer(champ, 700);
      await page.keyboard.press('Control+A');
      await champ.pressSequentially('Votre salle de bain à Bordeaux, clés en main', {
        delay: 45 * p.tempo,
      });
      await p.attendre(900);
      await p.cliquer(page.getByRole('button', { name: 'Mobile', exact: true }), 800);
      await p.attendre(1300);
      await p.photo('s-modifier');
      console.log(await p.coupez());
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
      await page.waitForTimeout(2000);
    },
  },
  // S3 — Publier : le message « Site publié » apparaît.
  's-publier': {
    pro: true,
    jouer: async (p, page) => {
      await ouvrir(page, '/pro/site/editeur');
      await p.action('s-publier');
      await p.attendre(400);
      await p.cliquer(page.getByRole('button', { name: 'Publier', exact: true }), 900);
      await p.attendre(1800);
      await p.photo('s-publier');
      console.log(await p.coupez());
    },
  },
  // S4 — Un visiteur remplit le formulaire de devis du site publié.
  's-formulaire': {
    pro: false,
    jouer: async (p, page) => {
      await ouvrir(page, `http://${SLUG_SITE}.localhost:${PORT}/`);
      await p.action('s-formulaire');
      await p.attendre(500);
      await p.saisir(page.getByLabel(/^Nom et prénom/).first(), 'Claire Martin', 50);
      await p.saisir(page.getByLabel(/^Téléphone/).first(), '06 12 34 56 78', 40);
      await p.saisir(page.getByLabel(/^Email/).first(), 'claire.martin@exemple.fr', 35);
      await p.saisir(page.getByLabel(/^Code postal/).first(), '33000', 60);
      await p.cliquer(page.getByRole('button', { name: /Envoyer ma demande/ }).first(), 700);
      await p.attendre(1600);
      await p.photo('s-formulaire');
      console.log(await p.coupez());
    },
  },
  // S5 — La demande arrive dans « Mes demandes ».
  's-demandes': {
    pro: true,
    jouer: async (p, page) => {
      await ouvrir(page, '/pro/demandes');
      await p.action('s-demandes');
      await p.attendre(600);
      await p.survoler(page.getByText('Claire Martin').first(), 1100);
      await p.attendre(1500);
      await p.photo('s-demandes');
      console.log(await p.coupez());
    },
  },
};

async function main() {
  const args = process.argv.slice(2);
  const format: Format = args.includes('mobile') ? 'mobile' : 'bureau';
  const noms = args.filter((a) => a in SCENES);
  for (const nom of noms.length ? noms : Object.keys(SCENES).filter((n) => n !== 'preparer')) {
    const scene = SCENES[nom]!;
    const { navigateur, page, prise } = await plateau(format);
    try {
      if (scene.pro) await connecter(page);
      await scene.jouer(prise, page);
      console.log(`✓ ${nom}-${format}`);
    } catch (e) {
      await prise.photo(`${nom}-ERREUR`).catch(() => undefined);
      console.error(`✗ ${nom}-${format} :`, e instanceof Error ? e.message.split('\n')[0] : e);
    } finally {
      await navigateur.close();
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
