import { expect, test } from '@playwright/test';
import { connecter } from './outils';

// docs/CONVERSION.md §3 bis et ter (lot 13b), sur émulateurs.
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('CONV-08 : publication du jour sans donnée personnelle, lien utm ; invendues offertes', async ({
  page,
}) => {
  await connecter(page, 'admin@test.local', '/admin/appels-d-offres/facebook', 'admin');
  await expect(
    page.getByRole('heading', { name: 'Facebook et invendues', level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Demandes invendues offertes' })).toBeVisible();
  const texte = page.getByLabel('Texte de la publication');
  if (await texte.count()) {
    const valeur = await texte.inputValue();
    expect(valeur).toContain('utm_source=facebook&utm_medium=groupe&utm_campaign=trouver-chantier');
    expect(valeur).not.toMatch(/@|\+33|\b0[67]\d{8}\b/);
    await page.getByRole('button', { name: 'Marquer comme publiée' }).click();
    await expect(page.getByText('Publication du jour marquée comme faite.')).toBeVisible();
  } else {
    await expect(page.getByText(/Moins de 5 demandes/)).toBeVisible();
  }
});
