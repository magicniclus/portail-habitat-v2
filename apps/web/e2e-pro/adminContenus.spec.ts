import { expect, test } from '@playwright/test';
import { COMPTES, connecter } from './outils';

// docs/ADMIN.md §2.11 (lot 13f), sur émulateurs.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('annonce : publiée pour les artisans, visible dans leur espace, puis arrêtée', async ({
  page,
}) => {
  const titre = `Nouveauté ${Date.now().toString(36)}`;
  await connecter(page, 'admin@test.local', '/admin/contenus', 'admin');
  const form = page.getByRole('group', { name: 'Nouvelle annonce' });
  await form.getByLabel('Titre').fill(titre);
  await form.getByLabel('Texte').fill('Les appels d’offres sont ouverts dans votre zone.');
  await form.getByRole('button', { name: 'Publier l’annonce' }).click();
  await expect(form).toContainText('Annonce publiée.');

  await page.context().clearCookies();
  await connecter(page, COMPTES.proprio, '/pro/tableau-de-bord');
  await expect(page.getByRole('region', { name: 'Annonces' })).toContainText(titre);

  await page.context().clearCookies();
  await connecter(page, 'admin@test.local', '/admin/contenus', 'admin');
  const ligne = page.getByRole('listitem').filter({ hasText: titre });
  await expect(ligne).toContainText('En ligne');
  await ligne.getByRole('button', { name: 'Arrêter' }).click();
  const d = page.getByRole('dialog', { name: `Arrêter l’annonce : ${titre}` });
  await d.getByLabel('Motif (obligatoire)').fill('Fin de la campagne');
  await d.getByText('Je confirme cette action').click();
  await d.getByRole('button', { name: 'Confirmer' }).click();
  await expect(d).toBeHidden();
  await expect(ligne).toContainText('Arrêtée');
});
