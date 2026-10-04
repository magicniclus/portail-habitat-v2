import { expect, test } from '@playwright/test';
import { connecter, entrepriseSansCompteFixe, publierAvis } from './outils';

// docs/ADMIN.md §2.6 (lot 13e), sur émulateurs.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('avis : score de risque affiché, refus avec motif prédéfini, publication', async ({
  page,
}) => {
  const { id, nom } = await entrepriseSansCompteFixe(5);
  const refuse = await publierAvis(id, 'en_attente');
  const publie = await publierAvis(id, 'en_attente');
  await connecter(page, 'moderateur@test.local', '/admin/avis', 'admin');
  const a1 = page.getByRole('listitem').filter({ hasText: refuse });
  await expect(a1).toContainText('Risque');
  await expect(a1).toContainText('Ni preuve, ni mise en relation par le site');
  await a1.getByRole('button', { name: 'Refuser' }).click();
  const d1 = page.getByRole('dialog', { name: `Refuser : avis de ${refuse} sur ${nom}` });
  await d1.getByLabel('Motif envoyé à l’auteur').selectOption('Doublon');
  await d1.getByLabel('Motif (obligatoire)').fill('Même texte déjà publié');
  await d1.getByText('Je confirme cette action').click();
  await d1.getByRole('button', { name: 'Confirmer' }).click();
  await expect(d1).toBeHidden();
  await expect(a1).toHaveCount(0);

  const a2 = page.getByRole('listitem').filter({ hasText: publie });
  await a2.getByRole('button', { name: 'Publier' }).click();
  const d2 = page.getByRole('dialog', { name: `Publier : avis de ${publie} sur ${nom}` });
  await d2.getByLabel('Motif (obligatoire)').fill('Chantier vérifié');
  await d2.getByText('Je confirme cette action').click();
  await d2.getByRole('button', { name: 'Confirmer' }).click();
  await expect(d2).toBeHidden();
  await page.goto('/admin/avis?f=publies');
  await expect(page.getByRole('listitem').filter({ hasText: publie })).toContainText('Publié');
});
