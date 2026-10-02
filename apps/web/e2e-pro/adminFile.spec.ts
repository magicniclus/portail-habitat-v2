import { expect, test } from '@playwright/test';
import { connecter, creerTache, entrepriseSansCompteFixe } from './outils';

// docs/ADMIN.md §2.1 et §2.2 (lot 13b), sur émulateurs.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('tableau de bord : indicateurs, chiffre d’affaires réservé aux finances', async ({ page }) => {
  await connecter(page, 'admin@test.local', '/admin', 'admin');
  const indicateurs = page.getByRole('list', { name: 'Indicateurs' });
  await expect(indicateurs.getByText('Demandes reçues')).toBeVisible();
  await expect(indicateurs.getByText('Chiffre d’affaires HT')).toBeVisible();
  await expect(page.getByRole('figure')).toContainText('Demandes reçues par jour');
  await page.context().clearCookies();
  await connecter(page, 'moderateur@test.local', '/admin', 'admin');
  await expect(
    page.getByRole('list', { name: 'Indicateurs' }).getByText('Chiffre d’affaires HT'),
  ).toHaveCount(0);
});

test('file : une tâche apparaît, se prend et se clore avec sa résolution', async ({ page }) => {
  const { id, nom } = await entrepriseSansCompteFixe(2);
  await creerTache('avis', id);
  await connecter(page, 'moderateur@test.local', '/admin/file?type=Avis', 'admin');
  const tache = page.getByRole('listitem').filter({ hasText: nom });
  await expect(tache).toContainText('non assignée');
  await tache.getByRole('button', { name: 'Prendre' }).click();
  await expect(tache).toContainText('à vous');
  await tache.getByRole('button', { name: 'Marquer comme traitée' }).click();
  const dialogue = page.getByRole('dialog', { name: `Clore : ${nom}` });
  await dialogue.getByLabel('Motif (obligatoire)').fill('Avis publié après vérification');
  await dialogue.getByText('Je confirme cette action').click();
  await dialogue.getByRole('button', { name: 'Confirmer' }).click();
  await expect(tache).toHaveCount(0);
});
