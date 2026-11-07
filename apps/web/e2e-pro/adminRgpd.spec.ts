import { expect, test } from '@playwright/test';
import { audits, connecter } from './outils';

// docs/ADMIN.md §2.13 (lot 13g), sur émulateurs.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('RGPD : demande enregistrée avec son échéance, traitée, preuve téléchargeable', async ({
  page,
}) => {
  const email = `rgpd-${Date.now().toString(36)}@test.local`;
  await connecter(page, 'admin@test.local', '/admin/rgpd', 'admin');
  const form = page.getByRole('group', { name: 'Nouvelle demande' });
  await form.getByLabel('Type').selectOption('rectification');
  await form.getByLabel('Email de la personne').fill(email);
  await form.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(form).toContainText('Demande enregistrée.');
  const ligne = page
    .getByRole('listitem')
    .filter({ hasText: 'Rectification' })
    .filter({ hasText: 'aucun compte' })
    .first();
  await expect(ligne).toContainText(/Reste (30|31|28|29) jours/);
  await ligne.getByRole('button', { name: 'Marquer rectifié' }).click();
  const d = page.getByRole('dialog', { name: 'Marquer rectifié' });
  await d.getByLabel('Motif (obligatoire)').fill('Adresse corrigée à la demande');
  await d.getByText('Je confirme cette action').click();
  await d.getByRole('button', { name: 'Confirmer' }).click();
  await expect(d).toBeHidden();
  const traitee = page.getByRole('listitem').filter({ hasText: 'Traitée' }).first();
  const lien = await traitee.getByRole('link', { name: 'Preuve' }).getAttribute('href');
  const preuve = await page.request.get(lien!);
  expect(preuve.status()).toBe(200);
  expect(await preuve.text()).toContain('Adresse corrigée à la demande');
  expect(await audits('rgpd.consulter', decodeURIComponent(lien!.split('chemin=')[1]!))).toBe(1);
});
