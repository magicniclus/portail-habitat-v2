import { expect, test } from '@playwright/test';
import { activerPlans, nouveauPlan } from './dessinOutils';
import { COMPTES, connecter } from './outils';

test.beforeAll(activerPlans);

test.describe('Plans — Mes plans et niveaux (DES-01, DES-02, DES-04)', () => {
  test('DES-01 : maison en L meublée de démonstration, deux niveaux, toit et extérieur', async ({
    page,
  }) => {
    await connecter(page, COMPTES.proprio, '/pro/plans');
    await page
      .getByRole('button', { name: /Nouveau plan|Créer mon premier plan/ })
      .first()
      .click();
    await page.getByRole('radio', { name: /Maison en L meublée/ }).check();
    await page.getByRole('button', { name: 'Créer le plan' }).click();
    const plan = page.getByTestId('plan-2d');
    await expect(plan.getByRole('button', { name: /^Pièce / })).toHaveCount(6);
    for (const nom of ['Séjour', 'Cuisine', 'Salle de bains', 'WC'])
      await expect(plan.getByText(nom, { exact: true })).toBeVisible();
    await expect(plan.getByRole('button', { name: 'Canapé 3 places' })).toBeVisible();
    await expect(plan.getByRole('button', { name: 'Meuble évier' })).toBeVisible();
    await expect(plan.getByRole('button', { name: /^Piscine/ })).toHaveCount(1);
    await expect(plan.getByRole('button', { name: /^Escalier / })).toHaveCount(1);
    // Étage meublé au-dessus.
    await page.locator('header select').first().selectOption({ index: 0 });
    await expect(plan.getByText('Salle d’eau', { exact: true })).toBeVisible();
    await expect(plan.getByRole('button', { name: /^Pièce / })).toHaveCount(6);
  });

  test('DES-01 : créer un plan depuis un modèle (T3), pièces déjà nommées', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/plans');
    await page
      .getByRole('button', { name: /Nouveau plan|Créer mon premier plan/ })
      .first()
      .click();
    await page.getByRole('radio', { name: /^T3/ }).check();
    await expect(page.getByLabel('Largeur hors tout (cm)')).toHaveCount(0);
    await page.getByRole('button', { name: 'Créer le plan' }).click();
    const plan = page.getByTestId('plan-2d');
    await expect(plan.getByRole('button', { name: /^Pièce / })).toHaveCount(4);
    for (const nom of ['Séjour', 'Salle de bains'])
      await expect(plan.getByText(nom, { exact: true })).toBeVisible();
    await expect(plan.getByText('Chambre', { exact: true })).toHaveCount(2);
  });

  test('DES-02, DES-04 : régler et réordonner les niveaux, retrouver le plan par la recherche', async ({
    page,
  }, info) => {
    await nouveauPlan(page);
    const titre = `Maison ${info.project.name} ${Date.now()}`;
    await page.getByLabel('Nom du projet').fill(titre);
    await page.getByLabel('Nom du projet').blur();

    // DES-04 : un étage et des combles ; hauteur du rez-de-chaussée, combles descendus d'un cran.
    const menu = page
      .getByRole('navigation', { name: 'Menus du plan' })
      .getByRole('button', { name: 'Structure' });
    if ((await menu.getAttribute('aria-pressed')) !== 'true') await menu.click();
    await page.getByRole('button', { name: /^Niveaux/ }).click();
    await page.getByRole('button', { name: '+ Étage' }).click();
    await page.getByRole('button', { name: '+ Combles' }).click();
    await page.getByRole('button', { name: 'Voir' }).last().click();
    await page.getByLabel('Hauteur sous plafond (cm)').fill('280');
    await page.getByLabel('Hauteur sous plafond (cm)').press('Enter');
    await page.getByRole('button', { name: 'Descendre le niveau Combles' }).click();
    const niveaux = page.getByRole('textbox', { name: /^Nom du niveau / });
    await expect(niveaux).toHaveCount(3);
    await expect(niveaux.nth(0)).toHaveValue('Étage 1');
    await expect(niveaux.nth(1)).toHaveValue('Combles');
    await expect(page.getByText('Plancher à 3,00 m')).toBeVisible();

    // DES-02 : la liste montre l'aperçu ; la recherche ignore accents et majuscules.
    await page.getByRole('button', { name: 'Enregistrer une version' }).click();
    await expect(page.getByText('Enregistré', { exact: true })).toBeAttached();
    await page.getByRole('link', { name: 'Mes plans' }).click();
    await page.getByLabel('Rechercher un plan').fill(titre.toUpperCase());
    const carte = page.getByRole('listitem').filter({ hasText: titre });
    await expect(carte).toHaveCount(1);
    await expect(carte.getByTestId('apercu-plan').locator('path')).toHaveCount(1);
    await page.getByLabel('Rechercher un plan').fill('zzz introuvable');
    await expect(page.getByText(/Aucun plan ne correspond/)).toBeVisible();
  });
});
