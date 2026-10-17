import { expect, test } from '@playwright/test';
import { audits, connecter } from './outils';

// docs/ADMIN.md §2.10 (lot 13f), sur émulateurs.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('algorithme : total des poids à 100, bac à sable, publication versionnée', async ({
  page,
}) => {
  await connecter(page, 'admin@test.local', '/admin/matching', 'admin');
  const distance = page.getByLabel('Distance (%)');
  const initial = await distance.inputValue();
  const publier = page.getByRole('button', { name: 'Publier la configuration' });
  await distance.fill(String(Number(initial) + 5));
  await expect(page.getByText(/total \d+ %/)).toContainText(`${100 + 5} %`);
  await expect(publier).toBeDisabled();
  await distance.fill(initial);
  await expect(publier).toBeEnabled();
  const bac = page.getByRole('region', { name: 'Bac à sable' });
  await bac.getByLabel('Référence d’une demande passée').fill('PH-ZZZZZZ');
  await bac.getByRole('button', { name: 'Rejouer avec ces réglages' }).click();
  await expect(bac).toContainText('Aucune demande avec cette référence.');
  await publier.click();
  const dialogue = page.getByRole('dialog', {
    name: 'Publier une nouvelle version de l’algorithme',
  });
  await dialogue.getByLabel('Motif (obligatoire)').fill('Version de référence');
  await dialogue.getByText('Je confirme cette action').click();
  await dialogue.getByRole('button', { name: 'Confirmer' }).click();
  await expect(dialogue).toBeHidden();
  await expect(page.getByRole('region', { name: 'Versions' })).toContainText(
    'Version de référence',
  );
  expect(await audits('adminMajMatchingConfig', 'matchingConfig/actif')).toBeGreaterThan(0);
});
