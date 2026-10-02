import { expect, test } from '@playwright/test';
import { audits, COMPTES, connecter, entrepriseDe, entrepriseSansCompteFixe } from './outils';

// docs/ACCEPTANCE.md ADM-02 à ADM-04 (back-office, section Artisans), sur émulateurs.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('ADM-02 : coordonnées masquées ; « Afficher » écrit une entrée d’audit ; rien pour le rôle lecture', async ({
  page,
}) => {
  const { id } = await entrepriseSansCompteFixe(0);
  await connecter(page, 'admin@test.local', `/admin/artisans?id=${id}`, 'admin');
  const fiche = page.getByRole('region', { name: /Fiche de/ });
  const telephone = fiche.locator('dd').filter({ hasText: '•' }).first();
  await expect(telephone).toContainText('•');
  const avant = await audits('pii.afficher', `artisans/${id}`);
  await fiche.getByRole('button', { name: 'Afficher' }).first().click();
  await expect(fiche.getByRole('button', { name: 'Afficher' })).toHaveCount(0);
  await expect.poll(() => audits('pii.afficher', `artisans/${id}`)).toBe(avant + 1);

  await page.context().clearCookies();
  await connecter(page, 'lecture@test.local', `/admin/artisans?id=${id}`, 'admin');
  await expect(fiche.locator('dd').filter({ hasText: '•' }).first()).toBeVisible();
  await expect(fiche.getByRole('button', { name: 'Afficher' })).toHaveCount(0);
  await expect(fiche.getByRole('button', { name: 'Suspendre' })).toHaveCount(0);
});

test('ADM-03 : suspendre exige un motif et une confirmation, puis lever la suspension', async ({
  page,
}) => {
  const { id, nom } = await entrepriseSansCompteFixe(1);
  await connecter(page, 'admin@test.local', `/admin/artisans?id=${id}`, 'admin');
  const fiche = page.getByRole('region', { name: `Fiche de ${nom}` });
  await fiche.getByRole('button', { name: 'Suspendre' }).click();
  const dialogue = page.getByRole('dialog', { name: `Suspendre ${nom}` });
  const confirmer = dialogue.getByRole('button', { name: 'Confirmer' });
  await expect(confirmer).toBeDisabled();
  await dialogue.getByLabel('Motif (obligatoire)').fill('SIREN radié');
  await expect(confirmer).toBeDisabled();
  await dialogue.getByText('Je confirme cette action').click();
  await confirmer.click();
  await expect(fiche.getByRole('button', { name: 'Lever la suspension' })).toBeVisible();
  await expect.poll(() => audits('adminSanctionner', `artisans/${id}`)).toBe(1);

  await fiche.getByRole('button', { name: 'Lever la suspension' }).click();
  const lever = page.getByRole('dialog', { name: `Lever la suspension de ${nom}` });
  await lever.getByLabel('Motif (obligatoire)').fill('Kbis à jour');
  await lever.getByText('Je confirme cette action').click();
  await lever.getByRole('button', { name: 'Confirmer' }).click();
  await expect(fiche.getByRole('button', { name: 'Suspendre' })).toBeVisible();
});

test('ADM-04 : « voir en tant que » : bandeau rouge et toute écriture échoue', async ({ page }) => {
  const artisanId = await entrepriseDe(COMPTES.proprio);
  await connecter(page, 'admin@test.local', `/admin/artisans?id=${artisanId}`, 'admin');
  await page.getByRole('button', { name: 'Voir en tant que' }).click();
  const dialogue = page.getByRole('dialog', { name: /Voir l’espace de/ });
  await dialogue.getByLabel('Motif (obligatoire)').fill('Ticket support 42');
  await dialogue.getByText('Je confirme cette action').click();
  await dialogue.getByRole('button', { name: 'Confirmer' }).click();
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord/);
  await expect(page.getByRole('alert').filter({ hasText: 'voir en tant que' })).toBeVisible();
  const r = await page.evaluate(async () => {
    const res = await fetch('/api/pro/demandes/prendre', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ demandeId: 'inexistante' }),
    });
    return (await res.json()) as { ok: boolean; message?: string };
  });
  expect(r).toMatchObject({ ok: false, message: expect.stringContaining('voir en tant que') });
});
