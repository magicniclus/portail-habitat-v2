import { expect, test } from '@playwright/test';
import { appelOffresInvite, audits, connecter, entrepriseSansCompteFixe } from './outils';

// docs/ADMIN.md §2.5 (lot 13d), sur émulateurs.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('éditeur de prix : réservé à leads.prix, prix manuel avec motif et historique', async ({
  page,
}) => {
  const { id: artisanId } = await entrepriseSansCompteFixe(4);
  const { id, titre } = await appelOffresInvite(artisanId);
  const adresse = `/admin/appels-d-offres?f=ouverts&id=${id}`;
  await connecter(page, 'finance@test.local', adresse, 'admin');
  const fiche = page.getByRole('region', { name: titre });
  await expect(fiche).toContainText('19 € HT');
  await expect(fiche.getByRole('button', { name: 'Modifier le prix' })).toBeDisabled();
  await page.context().clearCookies();
  await connecter(page, 'admin@test.local', adresse, 'admin');
  await fiche.getByRole('button', { name: 'Modifier le prix' }).click();
  const dialogue = page.getByRole('dialog', { name: `Prix : ${titre}` });
  await dialogue.getByLabel('Prix HT (€)', { exact: true }).fill('25');
  await dialogue.getByLabel('Prix Premium HT (€)').fill('18');
  await dialogue.getByLabel('Prix en crédits').fill('3');
  await dialogue.getByLabel('Motif (obligatoire)').fill('Lead très qualifié');
  await dialogue.getByText('Je confirme cette action').click();
  await dialogue.getByRole('button', { name: 'Confirmer' }).click();
  await expect(fiche).toContainText('25 € HT');
  await expect(fiche.getByRole('list', { name: 'Historique des prix' })).toContainText(
    'Lead très qualifié',
  );
  expect(await audits('adminFixerPrixLead', `appelsOffres/${id}`)).toBe(1);
});
