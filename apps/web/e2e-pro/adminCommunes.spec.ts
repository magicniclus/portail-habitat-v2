import { chemins } from '@ph/firebase/chemins';
import { expect, test } from '@playwright/test';
import { admin, audits, connecter } from './outils';

// ADMIN §2.9 : textes des pages communes, versionnés, publiés sur la page publique.
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('pages communes : une nouvelle version des textes apparaît sur la page publique', async ({
  page,
}) => {
  const { db } = await admin();
  await db
    .doc(chemins.communeTexte('cenon'))
    .delete()
    .catch(() => undefined);
  await connecter(
    page,
    'admin@test.local',
    '/admin/referentiels?onglet=communes&commune=cenon',
    'admin',
  );
  const formulaire = page.getByRole('form', { name: 'Textes de Cenon' });
  await expect(formulaire.getByText('Textes d’origine (docs/data/communes.json).')).toBeVisible();
  const intro = `Cenon, sur les coteaux de la rive droite : texte de test ${Date.now()}.`;
  await formulaire.getByLabel('Introduction').fill(intro);
  await formulaire.getByLabel('Motif (obligatoire)').fill('Mise à jour SEO');
  await formulaire.getByRole('button', { name: 'Publier la nouvelle version' }).click();
  await expect(formulaire.getByText('Version 1 en ligne.')).toBeVisible();
  expect(await audits('adminTexteCommune', chemins.communeTexte('cenon'))).toBe(1);
  // Page régénérée à la demande : la première visite peut encore servir l'ancienne version.
  await expect
    .poll(
      async () => {
        await page.goto('/diagnostic-immobilier/cenon');
        return page.getByText(intro).count();
      },
      { timeout: 20_000 },
    )
    .toBe(1);
});
