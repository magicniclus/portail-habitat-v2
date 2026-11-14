import { expect, test } from '@playwright/test';
import {
  appelOffresDebloque,
  audits,
  COMPTES,
  connecter,
  entrepriseDe,
  soldeCredits,
} from './outils';

// docs/ADMIN.md §2.5 et DATABASE §5 (lot 13d), sur émulateurs.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('contestation : l’artisan conteste, l’équipe rend les crédits', async ({ page }) => {
  const artisanId = await entrepriseDe(COMPTES.proprio);
  const { reference, achatId } = await appelOffresDebloque(artisanId);
  await soldeCredits(artisanId, 5);
  await connecter(page, COMPTES.proprio, '/pro/demandes');
  const carte = page.getByRole('listitem').filter({ hasText: reference });
  await carte.getByRole('button', { name: 'Contester' }).click();
  const feuille = page.getByRole('dialog', { name: 'Contester cette demande' });
  await feuille
    .getByLabel('Ce qui s’est passé')
    .fill('Numéro non attribué, trois appels sans succès.');
  await feuille.getByRole('button', { name: 'Envoyer la contestation' }).click();
  await expect(feuille.getByText('Contestation envoyée')).toBeVisible();

  await page.context().clearCookies();
  await connecter(page, 'admin@test.local', '/admin/appels-d-offres/contestations', 'admin');
  const ligne = page.getByRole('listitem').filter({ hasText: 'Numéro non attribué' }).first();
  await expect(ligne).toContainText('Numéro invalide');
  await ligne.getByRole('button', { name: 'Rembourser en crédits' }).click();
  const dialogue = page.getByRole('dialog', { name: /^Rembourser en crédits/ });
  await dialogue.getByLabel('Motif (obligatoire)').fill('Numéro vérifié, non attribué');
  await dialogue.getByText('Je confirme cette action').click();
  await dialogue.getByRole('button', { name: 'Confirmer' }).click();
  await expect(dialogue).toBeHidden();
  await expect(page.getByRole('listitem').filter({ hasText: 'Numéro non attribué' })).toHaveCount(
    0,
  );
  expect(await soldeCredits(artisanId)).toBe(7);
  expect(await audits('adminTraiterRemboursementLead', `remboursementsLeads/${achatId}`)).toBe(1);
});
