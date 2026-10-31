import { expect, test } from '@playwright/test';
import { connecter } from './outils';

// docs/ADMIN.md §2.12 (lot 13g), sur émulateurs.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('équipe : inviter un membre, le désactiver ; journal filtré et exporté', async ({ page }) => {
  const email = `membre-${Date.now().toString(36)}@test.local`;
  await connecter(page, 'admin@test.local', '/admin/equipe', 'admin');
  const form = page.getByRole('group', { name: 'Inviter un membre' });
  await form.getByLabel('Email').fill(email);
  await form.getByLabel('Prénom et nom').fill('Léa Martin');
  await form.getByRole('button', { name: 'Envoyer l’invitation' }).click();
  await expect(form).toContainText(`Invitation envoyée à ${email}.`);
  const ligne = page.getByRole('listitem').filter({ hasText: email });
  await ligne.getByRole('button', { name: 'Désactiver' }).click();
  const d = page.getByRole('dialog', { name: 'Désactiver : Léa Martin' });
  await d.getByLabel('Motif (obligatoire)').fill('Fin de mission');
  await d.getByText('Je confirme cette action').click();
  await d.getByRole('button', { name: 'Confirmer' }).click();
  await expect(d).toBeHidden();
  await expect(ligne).toContainText('Désactivé');

  await page.getByRole('link', { name: 'Journal d’audit' }).click();
  await page.getByLabel('Valeur').fill('adminModifierEquipe');
  await page.getByRole('button', { name: 'Filtrer' }).click();
  await expect(page.getByRole('list', { name: 'Journal' })).toContainText('Fin de mission');
  const csv = await page.request.get(
    '/admin/equipe/audit/export?champ=action&valeur=adminModifierEquipe',
  );
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain('Fin de mission');
});

test('équipe : réservée au superadmin, le modérateur reçoit une 403', async ({ page }) => {
  await connecter(page, 'moderateur@test.local', '/admin', 'admin');
  const r = await page.goto('/admin/equipe');
  expect(r?.status()).toBe(403);
});
