import { expect, test } from '@playwright/test';
import { audits, connecter, entrepriseSansCompteFixe, litigeOuvert } from './outils';

// docs/ADMIN.md §2.7 (lot 13e), sur émulateurs.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('litige : message du médiateur puis clôture avec avertissement', async ({ page }) => {
  const { id: artisanId, nom } = await entrepriseSansCompteFixe(6);
  const { id } = await litigeOuvert(artisanId);
  await connecter(page, 'moderateur@test.local', `/admin/litiges?id=${id}`, 'admin');
  const fiche = page.getByRole('region', { name: `Litige : Camille M. et ${nom}` });
  await expect(fiche.getByRole('list', { name: 'Échanges' })).toContainText('Travaux arrêtés');
  await fiche.getByLabel('Message aux deux parties').fill('Merci d’indiquer une date de reprise.');
  await fiche.getByRole('button', { name: 'Envoyer' }).click();
  await expect(fiche.getByRole('list', { name: 'Échanges' })).toContainText('Médiateur');
  await expect(fiche).toContainText('En médiation');
  await fiche.getByRole('button', { name: 'Clore le litige' }).click();
  const dialogue = page.getByRole('dialog', { name: 'Clore le litige' });
  await dialogue.getByLabel('Conséquence pour l’artisan').selectOption('avertissement');
  await dialogue.getByLabel('Motif (obligatoire)').fill('Reprise confirmée par les deux parties');
  await dialogue.getByText('Je confirme cette action').click();
  await dialogue.getByRole('button', { name: 'Confirmer' }).click();
  await expect(dialogue).toBeHidden();
  await expect(fiche).toContainText('Résolu');
  expect(await audits('adminDeciderLitige', `litiges/${id}`)).toBe(1);
});
