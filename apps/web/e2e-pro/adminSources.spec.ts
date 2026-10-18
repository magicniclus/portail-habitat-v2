import { expect, test } from '@playwright/test';
import { audits, connecter, sourceAvecImports } from './outils';

// IMP-02 : le motif de rejet est visible dans l'admin, sans donnée personnelle.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('IMP-02 : journal des imports avec motif de rejet ; couper une source', async ({ page }) => {
  const { id, nom } = await sourceAvecImports();
  await connecter(page, 'admin@test.local', `/admin/demandes/sources?id=${id}`, 'admin');
  const source = page.getByRole('listitem').filter({ hasText: nom });
  await expect(source).toContainText('1 créées');
  await expect(source).toContainText('1 rejetées');
  const journal = page.getByRole('region', { name: 'Journal des imports' });
  await expect(journal).toContainText(
    'Rejetée : consentement incomplet (consentement.texteAffiche)',
  );
  await source.getByRole('button', { name: 'Couper la source' }).click();
  const dialogue = page.getByRole('dialog', { name: `Couper : ${nom}` });
  await dialogue.getByLabel('Motif (obligatoire)').fill('Trop de doublons');
  await dialogue.getByText('Je confirme cette action').click();
  await dialogue.getByRole('button', { name: 'Confirmer' }).click();
  await expect(dialogue).toBeHidden();
  await expect(source).toContainText('Coupée');
  expect(await audits('adminActiverSource', `sourcesDemandes/${id}`)).toBe(1);
});
