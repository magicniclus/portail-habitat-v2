import { expect, test } from '@playwright/test';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import { activerPlans } from './dessinOutils';
import { COMPTES, connecter } from './outils';

test.beforeAll(activerPlans);

test.describe('Plans — couleur des menuiseries (DES-14)', () => {
  test('DES-14 couleurs : bois foncé sur toutes les menuiseries, puis couleur libre', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await connecter(page, COMPTES.proprio, '/pro/plans');
    await page
      .getByRole('button', { name: /Nouveau plan|Créer mon premier plan/ })
      .first()
      .click();
    await page.getByRole('radio', { name: /Maison en L meublée/ }).check();
    await page.getByRole('button', { name: 'Créer le plan' }).click();
    const plan = page.getByTestId('plan-2d');
    const proprietes = async () => {
      if (page.viewportSize()!.width < 900)
        await page
          .getByRole('button', { name: 'Propriétés' })
          .click()
          .catch(() => undefined);
    };
    const nuancier = page.getByRole('group', { name: /^Couleur de la menuiserie/ });

    // Sélection au clavier : le symbole (arc d'ouverture compris) déborde sur les murs voisins.
    const choisir = async (nom: RegExp) => {
      await plan.getByRole('button', { name: nom }).first().focus();
      await page.keyboard.press('Enter');
    };
    await choisir(/^Porte d’entrée/);
    await proprietes();
    await nuancier.getByRole('button', { name: 'Bois foncé' }).click();
    // Le panneau des propriétés ne déborde jamais en largeur (contenu coupé à gauche).
    for (const corps of await page.getByTestId('corps-panneau').all()) {
      const [large, visible] = await corps.evaluate((el) => [el.scrollWidth, el.clientWidth]);
      expect(large).toBeLessThanOrEqual(visible);
    }
    await page.getByRole('button', { name: 'Appliquer à toutes les menuiseries' }).click();

    await choisir(/^Porte-fenêtre/);
    await proprietes();
    await expect(nuancier.getByRole('button', { name: 'Bois foncé' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Couleur choisie à la main.
    await nuancier.getByLabel(/couleur libre/).fill(COULEURS_PLAN.murSelection);
    await expect(nuancier).toHaveAccessibleName(/personnalisée/);
  });
});
