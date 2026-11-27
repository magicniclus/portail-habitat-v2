import { expect, test } from '@playwright/test';
import { audits, connecter, entrepriseSansCompteFixe, proposerDemande } from './outils';

// docs/ADMIN.md §2.4 (lot 13d), sur émulateurs.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('demandes : contact masqué, artisan sollicité, spam réservé et audité', async ({ page }) => {
  const { id, nom } = await entrepriseSansCompteFixe(3);
  const { reference, demandeId } = await proposerDemande(id);
  await connecter(page, 'moderateur@test.local', `/admin/demandes?ref=${reference}`, 'admin');
  await page.getByRole('link', { name: new RegExp(reference) }).click();
  const fiche = page.getByRole('region', { name: `Demande ${reference}` });
  await expect(fiche).toContainText('Hélène M.');
  await expect(fiche).not.toContainText('helene@test.local');
  await expect(fiche).toContainText(nom);
  // Le modérateur lit la demande mais ne peut pas la rejeter (`demandes.annuler`).
  await expect(fiche.getByRole('button', { name: 'Marquer comme spam' })).toBeDisabled();
  await page.context().clearCookies();
  await connecter(page, 'admin@test.local', `/admin/demandes?ref=${reference}`, 'admin');
  await page.getByRole('link', { name: new RegExp(reference) }).click();
  await fiche.getByRole('button', { name: 'Marquer comme spam' }).click();
  const dialogue = page.getByRole('dialog', { name: `Marquer ${reference} comme spam` });
  await dialogue.getByLabel('Motif (obligatoire)').fill('Numéro et texte de test');
  await dialogue.getByText('Je confirme cette action').click();
  await dialogue.getByRole('button', { name: 'Confirmer' }).click();
  await expect(fiche).toContainText('Spam');
  expect(await audits('adminRejeterDemande', `demandes/${demandeId}`)).toBe(1);
});
