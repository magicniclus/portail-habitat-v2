import { expect, test } from '@playwright/test';
import { COMPTES, connecter } from './outils';

// Maquette Ma Fiche : modification section par section (droit fiche.modifier).
test.describe('Ma fiche', () => {
  test('le propriétaire modifie la présentation et le devis moyen', async ({ page }, info) => {
    const accroche = `Couverture et zinguerie (${info.project.name} ${Date.now()})`;
    await connecter(page, COMPTES.proprio, '/pro/fiche');
    const presentation = page.getByRole('region', { name: 'Présentation' });
    await presentation.getByRole('button', { name: 'Modifier : Présentation' }).click();
    const feuille = page.getByRole('dialog', { name: 'Présentation' });
    await feuille.getByLabel(/^Accroche/).fill(accroche);
    await feuille.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(feuille).toBeHidden();
    await expect(presentation).toContainText(accroche);

    const devis = page.getByRole('region', { name: 'Devis moyen' });
    await devis.getByRole('button', { name: 'Modifier : Devis moyen' }).click();
    const f2 = page.getByRole('dialog', { name: 'Devis moyen' });
    await f2.getByLabel(/^Minimum/).fill('1000');
    await f2.getByLabel(/^Maximum/).fill('20000');
    await f2.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(devis).toContainText(/1\s000\s–\s20\s000\s€/);
  });

  test('devis inversé : message d’erreur, rien n’est enregistré', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/fiche');
    await page.getByRole('button', { name: 'Modifier : Devis moyen' }).click();
    const f = page.getByRole('dialog', { name: 'Devis moyen' });
    await f.getByLabel(/^Minimum/).fill('5000');
    await f.getByLabel(/^Maximum/).fill('100');
    await f.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(f.getByRole('alert').first()).toBeVisible();
    await expect(f).toBeVisible();
  });

  test('le collaborateur voit la fiche sans pouvoir la modifier', async ({ page }) => {
    await connecter(page, COMPTES.collab, '/pro/fiche');
    await expect(
      page.getByText('Seuls le propriétaire et le gérant peuvent modifier la fiche.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^Modifier/ })).toHaveCount(0);
  });
});
