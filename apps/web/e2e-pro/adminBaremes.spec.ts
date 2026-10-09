import { expect, test } from '@playwright/test';
import { appelOffresInvite, connecter, entrepriseSansCompteFixe } from './outils';

// ADM-05 (docs/ACCEPTANCE.md) : l'effet d'un barème s'affiche avant publication.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('ADM-05 : simuler sur les derniers leads avant de publier une nouvelle version', async ({
  page,
}) => {
  const { id } = await entrepriseSansCompteFixe(4);
  await appelOffresInvite(id);
  await connecter(page, 'admin@test.local', '/admin/appels-d-offres/baremes', 'admin');
  const publier = page.getByRole('button', { name: 'Publier le barème' });
  await expect(publier).toBeDisabled();
  const plafond = page.getByLabel('Plafond (€ HT)');
  const initial = await plafond.inputValue();
  const valeur = page.getByLabel('Budget moins de 5 000 €');
  await valeur.fill('2');
  await page.getByRole('button', { name: 'Simuler sur les 50 derniers leads' }).click();
  const simulation = page.getByRole('region', { name: 'Simulation' });
  await expect(simulation).toContainText('en hausse');
  await expect(simulation).not.toContainText('0 en hausse');
  // Les prix ne changent pas pour la suite des tests : on publie les valeurs d'origine.
  await valeur.fill('0.8');
  await expect(publier).toBeDisabled();
  await page.getByRole('button', { name: 'Simuler sur les 50 derniers leads' }).click();
  await expect(simulation).toContainText('0 en hausse');
  await publier.click();
  const dialogue = page.getByRole('dialog', { name: 'Publier le nouveau barème' });
  await dialogue.getByLabel('Motif (obligatoire)').fill('Version de référence');
  await dialogue.getByText('Je confirme cette action').click();
  await dialogue.getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByRole('region', { name: 'Versions' })).toContainText('active');
  await expect(plafond).toHaveValue(initial);
});
