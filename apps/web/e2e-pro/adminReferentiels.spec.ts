import { expect, test, type Page } from '@playwright/test';
import { audits, connecter } from './outils';

// docs/ADMIN.md §2.9 (lot 13f), sur émulateurs.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

async function publier(page: Page, motif: string) {
  await page.getByRole('button', { name: /^Publier 1 modification/ }).click();
  const dialogue = page.getByRole('dialog', { name: /^Nouveaux prix/ });
  await dialogue.getByLabel('Motif (obligatoire)').fill(motif);
  await dialogue.getByText('Je confirme cette action').click();
  await dialogue.getByRole('button', { name: 'Confirmer' }).click();
  await expect(dialogue).toBeHidden();
}

test('référentiels : nouvelle version des prix d’une prestation ; bascule d’une fonctionnalité', async ({
  page,
}) => {
  await connecter(page, 'admin@test.local', '/admin/referentiels', 'admin');
  await page.getByRole('list', { name: 'Prestations' }).getByRole('link').first().click();
  const fiche = page.getByRole('region', { name: /^Prix : / });
  const version = await fiche.getByText(/^Version /).textContent();
  const champ = fiche.getByRole('textbox').first();
  const initial = await champ.inputValue();
  await champ.fill(String(Number(initial) + 1));
  await publier(page, 'Test de publication');
  await expect(fiche.getByText(/^Version /)).not.toHaveText(version!);
  // Remise à la valeur d'origine (nouvelle version) pour ne pas changer les estimations.
  await fiche.getByRole('textbox').first().fill(initial);
  await publier(page, 'Retour à la valeur initiale');

  await page.getByRole('link', { name: 'Configuration' }).click();
  const ligne = page.getByRole('listitem').filter({ hasText: 'SMS à chaque nouvelle demande' });
  for (const action of ['Activer', 'Désactiver']) {
    await ligne.getByRole('button', { name: action }).click();
    const d = page.getByRole('dialog', { name: new RegExp(`^${action}`) });
    await d.getByLabel('Motif (obligatoire)').fill('Essai de bascule');
    await d.getByText('Je confirme cette action').click();
    await d.getByRole('button', { name: 'Confirmer' }).click();
    await expect(d).toBeHidden();
  }
  await expect(ligne).toContainText('Désactivé');
  expect(await audits('adminChangerFlag', 'config/flags')).toBeGreaterThanOrEqual(2);
});
