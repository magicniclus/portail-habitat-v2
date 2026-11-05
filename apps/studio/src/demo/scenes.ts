import type { ArtisanFictif, SceneCapture } from '@ph/core/studio';
import type { Page } from '@playwright/test';
import { carteChargee, cliquer, defiler, taper, viser } from './gestes';

/**
 * Les écrans que le robot sait filmer (catalogue `SCENES_CAPTURE`), joués comme un vrai
 * utilisateur sur la copie de démonstration. `pret()` marque le début utile (page chargée).
 */
export interface ContexteScene {
  slug: string;
  artisan: ArtisanFictif | null;
  pret: () => void;
}

const metier = (c: ContexteScene) => c.artisan?.metier ?? 'Plombier';
const ville = (c: ContexteScene) => c.artisan?.ville ?? 'Bordeaux';

async function charger(page: Page, url: string, c: ContexteScene) {
  await page.goto(url);
  await page.waitForLoadState('load');
  await page.waitForTimeout(700);
  await page.mouse.move(200, 300);
  c.pret();
}

async function remplirDevis(page: Page) {
  await taper(page, page.getByLabel('Nom du client'), 'Claire Martin', 30);
  await page.getByLabel('Adresse du client').fill('3 rue des Lilas, 33700 Mérignac');
  await page.getByLabel('Email du client').fill('claire@exemple.fr');
  await taper(page, page.getByLabel('Objet du devis'), 'Rénovation salle de bain', 25);
  const lignes = [
    ['Dépose baignoire et évacuation', '1', '450'],
    ['Douche à l’italienne, receveur extra-plat', '1', '1890'],
  ];
  for (const [i, [d, q, pu]] of lignes.entries()) {
    if (i > 0) await cliquer(page, page.getByRole('button', { name: 'Ligne simple' }));
    const l = page.getByRole('group', { name: `Ligne ${i + 1}` });
    await taper(page, l.getByLabel('Désignation'), d!, 15);
    await l.getByLabel('Quantité').fill(q!);
    await taper(page, l.getByLabel('PU HT (€)'), pu!, 40);
  }
  await page.getByRole('checkbox', { name: 'Début et durée des travaux' }).check();
  await page.getByLabel('Début des travaux').fill('2026-11-16');
  await page.getByLabel('Durée estimée').fill('5 jours ouvrés');
}

export const SCENES: Record<
  SceneCapture,
  { pro: boolean; jouer: (page: Page, c: ContexteScene) => Promise<void> }
> = {
  annuaire_recherche: {
    pro: false,
    jouer: async (page, c) => {
      await charger(page, '/artisans', c);
      await taper(page, page.getByRole('searchbox').first(), metier(c), 70);
      const v = page.getByRole('combobox').first();
      if (await v.isVisible().catch(() => false)) {
        await taper(page, v, ville(c), 70);
        await page
          .getByRole('option')
          .first()
          .click({ timeout: 5_000 })
          .catch(() => undefined);
      }
      await cliquer(page, page.getByRole('button', { name: 'Rechercher' }).first());
      await page.waitForLoadState('load');
      await carteChargee(page);
      await defiler(page, 700, 3000);
    },
  },
  fiche_publique: {
    pro: false,
    jouer: async (page, c) => {
      await charger(page, `/artisans/${c.slug}`, c);
      await carteChargee(page);
      await page.waitForTimeout(800);
      await defiler(page, 900, 3500);
      await defiler(page, 900, 3500);
    },
  },
  formulaire_demande: {
    pro: false,
    jouer: async (page, c) => {
      await charger(page, `/artisans/${c.slug}`, c);
      const f = page.getByRole('complementary', { name: 'Demander un devis' });
      await viser(page, f);
      await taper(page, f.getByLabel(/^Prénom/), 'Claire', 45);
      await taper(page, f.getByLabel(/^Nom/), 'Martin', 45);
      await f.getByLabel(/^Email/).fill('claire.martin@exemple.fr');
      await f.getByLabel(/^Téléphone/).fill('06 12 34 56 78');
      await f.getByLabel(/^Code postal/).fill('33700');
      await taper(
        page,
        f.getByLabel(/^Description/),
        'Douche à l’italienne à la place de la baignoire.',
        20,
      );
      await cliquer(page, f.getByRole('checkbox', { name: /transmises/ }));
      await cliquer(page, f.getByRole('button', { name: 'Envoyer ma demande' }));
      await page.getByRole('heading', { name: 'Demande envoyée' }).waitFor();
      await page.waitForTimeout(1500);
    },
  },
  demandes_recues: {
    pro: true,
    jouer: async (page, c) => {
      await charger(page, '/pro/demandes', c);
      await page.waitForTimeout(1200);
      await defiler(page, 600, 3000);
      await page.waitForTimeout(800);
    },
  },
  demande_detail: {
    pro: true,
    jouer: async (page, c) => {
      await charger(page, '/pro/demandes', c);
      const carte = page
        .getByRole('listitem')
        .filter({ hasText: /Via votre fiche|Demande/ })
        .first();
      await cliquer(page, carte);
      await page.waitForTimeout(1500);
      await defiler(page, 500, 2500);
    },
  },
  tableau_de_bord: {
    pro: true,
    jouer: async (page, c) => {
      await charger(page, '/pro/tableau-de-bord', c);
      await page.waitForTimeout(1200);
      await defiler(page, 700, 3500);
    },
  },
  devis_creation: {
    pro: true,
    jouer: async (page, c) => {
      await charger(page, '/pro/devis/nouveau', c);
      await remplirDevis(page);
      await cliquer(page, page.getByRole('button', { name: 'Valider', exact: true }));
      await page.getByRole('link', { name: 'Télécharger le PDF' }).waitFor({ timeout: 60_000 });
      await page.waitForTimeout(1200);
    },
  },
  facture: {
    pro: true,
    jouer: async (page, c) => {
      await charger(page, '/pro/devis/nouveau', c);
      await remplirDevis(page);
      await cliquer(page, page.getByRole('button', { name: 'Valider', exact: true }));
      await page.getByRole('link', { name: 'Télécharger le PDF' }).waitFor({ timeout: 60_000 });
      await cliquer(page, page.getByRole('button', { name: 'Envoyer au client' }));
      await cliquer(page, page.getByRole('button', { name: 'Le client a accepté' }));
      await cliquer(page, page.getByRole('button', { name: 'Transformer en facture' }));
      await page.getByRole('heading', { level: 1, name: /^Facture du devis D-/ }).waitFor();
      await cliquer(page, page.getByRole('button', { name: 'Émettre la facture' }));
      await cliquer(
        page,
        page.getByRole('dialog').getByRole('button', { name: 'Émettre la facture' }),
      );
      await page.getByRole('link', { name: 'Télécharger le PDF' }).waitFor({ timeout: 60_000 });
      await page.waitForTimeout(1200);
    },
  },
  site_editeur: {
    pro: true,
    jouer: async (page, c) => {
      await page.goto('/pro/site');
      const creer = page.getByRole('button', { name: 'Créer mon site' });
      if (await creer.isVisible().catch(() => false)) {
        await page.getByLabel(/^Adresse de votre site/).fill(c.slug.slice(0, 40));
        await creer.click();
        await page.getByRole('link', { name: 'Ouvrir l’éditeur' }).first().waitFor();
      }
      await charger(page, '/pro/site/editeur', c);
      await page.waitForTimeout(2500);
      const titre = page.frameLocator('iframe').first().locator('h1').first();
      await titre.click({ timeout: 10_000 }).catch(() => undefined);
      await page.waitForTimeout(2500);
    },
  },
  site_publie: {
    pro: true,
    jouer: async (page, c) => {
      await page.goto('/pro/site/editeur');
      await page
        .getByRole('button', { name: 'Publier', exact: true })
        .click({ timeout: 20_000 })
        .catch(() => undefined);
      await page.waitForTimeout(2000);
      await charger(page, `http://${c.slug.slice(0, 40)}.localhost:3300/`, c);
      await defiler(page, 1200, 4000);
      await defiler(page, 1200, 4000);
    },
  },
};
