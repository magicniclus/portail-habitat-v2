import {
  champsTropPetits,
  ciblesTropPetites,
  defileHorizontalement,
} from '@ph/config/playwright/mesures';
import { expect, test, type Page } from '@playwright/test';
import { COMPTES, connecter } from './outils';

// Maquette Espace Artisan Dashboard : cadre, menu selon le rôle (COMPTES §4.1), mobile (MOBILE §6).
const menu = (page: Page) => page.getByRole('navigation', { name: 'Espace pro' });

test.describe('Espace pro : tableau de bord', () => {
  test('propriétaire : menu complet, indicateurs, complétude', async ({ page }, info) => {
    await connecter(page, COMPTES.proprio);
    await expect(page.getByRole('heading', { level: 1, name: /^Bonjour / })).toBeVisible();
    await expect(page.getByText('Demandes ce mois')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Fiche complétée' })).toBeVisible();
    if (info.project.name === 'ordinateur') {
      await expect(menu(page).getByRole('link', { name: 'Tableau de bord' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      // NAV-01 : « Mon compte » épinglé en bas de la barre latérale.
      await expect(page.getByRole('link', { name: /^Mon compte/ })).toBeVisible();
      await page.getByRole('button', { name: 'Replier le menu' }).click();
      await expect(page.getByRole('button', { name: 'Déplier le menu' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    } else {
      await expect(menu(page).getByRole('link', { name: 'Tableau de bord' })).toBeVisible();
      await menu(page).getByRole('button', { name: 'Plus' }).click();
      const feuille = page.getByRole('dialog', { name: 'Plus' });
      await expect(feuille.getByRole('link', { name: 'Mon compte' })).toBeVisible();
    }
  });

  test('NAV-01 : Mon compte, mêmes onglets sur les 4 pages du compte', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/compte');
    const onglets = page
      .getByRole('navigation', { name: 'Mon compte', exact: true })
      .getByRole('link');
    for (const chemin of ['/pro/compte', '/pro/equipe', '/pro/abonnement', '/pro/aide']) {
      await page.goto(chemin);
      await expect(onglets).toHaveText([
        'Profil et sécurité',
        'Équipe',
        'Abonnement',
        'Aide & contact',
      ]);
      await expect(
        page
          .getByRole('navigation', { name: 'Mon compte', exact: true })
          .locator('[aria-current="page"]'),
      ).toHaveCount(1);
    }
    await expect(page.getByRole('heading', { level: 1, name: 'Aide & contact' })).toBeVisible();
  });

  test('collaborateur : pas d’abonnement dans Mon compte', async ({ page }) => {
    await connecter(page, COMPTES.collab, '/pro/compte');
    const onglets = page.getByRole('navigation', { name: 'Mon compte', exact: true });
    await expect(onglets.getByRole('link', { name: 'Équipe' })).toBeVisible();
    await expect(onglets.getByRole('link', { name: 'Abonnement' })).toHaveCount(0);
  });

  test('comptable : arrive sur la facturation, sans les demandes', async ({ page }) => {
    await connecter(page, COMPTES.compta, '/pro/abonnement');
    await page.goto('/pro/tableau-de-bord');
    await expect(page).toHaveURL(/\/pro\/abonnement$/);
    await expect(page.getByRole('link', { name: /Mes demandes|^demandes$/i })).toHaveCount(0);
  });

  test('MOB-01 à 03 sur les pages de l’espace pro', async ({ page }) => {
    await connecter(page, COMPTES.proprio);
    for (const chemin of [
      '/pro/tableau-de-bord',
      '/pro/demandes',
      '/pro/avis',
      '/pro/statistiques',
      '/pro/fiche',
      '/pro/equipe',
      '/pro/compte',
      '/pro/aide',
      '/pro/hors-ligne',
    ]) {
      await page.goto(chemin);
      await page.evaluate(() => document.fonts.ready);
      expect(await defileHorizontalement(page), chemin).toBe(false);
      expect(await ciblesTropPetites(page), chemin).toEqual([]);
      expect(await champsTropPetits(page), chemin).toEqual([]);
    }
  });
});
