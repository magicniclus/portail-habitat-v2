import { expect, test } from '@playwright/test';
import { COMPTES, connecter, PDF, png } from './outils';

// Maquette Ma Fiche : modification section par section (droit fiche.modifier).
test.describe('Ma fiche', () => {
  test('projet réalisé : photos, accord du propriétaire, puis retrait', async ({ page }, info) => {
    const titre = `Toiture ${info.project.name} ${Date.now()}`;
    await connecter(page, COMPTES.collab, '/pro/fiche');
    await page.getByRole('button', { name: 'Ajouter un projet' }).click();
    const f = page.getByRole('dialog', { name: 'Ajouter un projet' });
    await f.getByLabel(/^Titre du chantier/).fill(titre);
    await f.getByLabel(/^Ville/).fill('Mérignac');
    await f.getByLabel(/^Photos/).setInputFiles([png('a.png'), png('b.png'), png('c.png')]);
    const publier = f.getByRole('button', { name: 'Publier le projet' });
    await expect(publier).toBeDisabled();
    await f.getByRole('checkbox', { name: /propriétaire du chantier/ }).check();
    await publier.click();
    const projets = page.getByRole('list', { name: 'Projets réalisés' });
    await expect(projets).toContainText(titre, { timeout: 15_000 });
    await expect(projets).toContainText('3 photos');
    await projets.getByRole('button', { name: `Retirer ${titre}` }).click();
    await expect(page.getByText(titre)).toHaveCount(0);
  });

  test('le propriétaire ajoute un logo', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/fiche');
    await page.getByLabel(/logo/).setInputFiles(png('logo.png'));
    await expect(page.getByRole('img', { name: /^Logo de / })).toBeVisible({ timeout: 15_000 });
  });

  test('le propriétaire modifie la présentation et le devis moyen', async ({ page }, info) => {
    const accroche = `Couverture et zinguerie (${info.project.name} ${Date.now()})`;
    await connecter(page, COMPTES.proprio, '/pro/fiche');
    const presentation = page.getByRole('region', { name: 'Présentation' });
    await presentation.getByRole('button', { name: 'Modifier : Présentation' }).click();
    const feuille = page.getByRole('dialog', { name: 'Présentation' });
    await feuille.getByLabel(/^Accroche/).fill(accroche);
    await feuille.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(feuille).toBeHidden();
    await expect(presentation).toContainText(accroche);

    const devis = page.getByRole('region', { name: 'Devis moyen' });
    await devis.getByRole('button', { name: 'Modifier : Devis moyen' }).click();
    const f2 = page.getByRole('dialog', { name: 'Devis moyen' });
    await f2.getByLabel(/^Minimum/).fill('1000');
    await f2.getByLabel(/^Maximum/).fill('20000');
    await f2.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(devis).toContainText(/1\s000\s–\s20\s000\s€/);
  });

  test('assistant de rédaction : sans clé, message clair et texte intact', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/fiche');
    await page.getByRole('button', { name: 'Modifier : Présentation' }).click();
    const feuille = page.getByRole('dialog', { name: 'Présentation' });
    const apropos = feuille.getByLabel(/^À propos/);
    await apropos.fill('Couvreur a Bordeaux, on fait les toitures.');
    await feuille.getByRole('button', { name: 'Relire et corriger' }).click();
    await expect(
      feuille.getByText('L’assistant de rédaction n’est pas encore disponible.'),
    ).toBeVisible();
    await expect(apropos).toHaveValue('Couvreur a Bordeaux, on fait les toitures.');
  });

  test('projet : « Rédiger à partir des infos » demande d’abord un titre', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/fiche');
    await page.getByRole('button', { name: 'Ajouter un projet' }).click();
    const f = page.getByRole('dialog', { name: 'Ajouter un projet' });
    const rediger = f.getByRole('button', { name: 'Rédiger à partir des infos' });
    await expect(rediger).toBeDisabled();
    await f.getByLabel(/^Titre du chantier/).fill('Salle de bain');
    await rediger.click();
    await expect(
      f.getByText('L’assistant de rédaction n’est pas encore disponible.'),
    ).toBeVisible();
  });

  test('devis inversé : message d’erreur, rien n’est enregistré', async ({ page }) => {
    await connecter(page, COMPTES.proprio, '/pro/fiche');
    await page.getByRole('button', { name: 'Modifier : Devis moyen' }).click();
    const f = page.getByRole('dialog', { name: 'Devis moyen' });
    await f.getByLabel(/^Minimum/).fill('5000');
    await f.getByLabel(/^Maximum/).fill('100');
    await f.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(f.getByRole('alert').first()).toBeVisible();
    await expect(f).toBeVisible();
  });

  test('le collaborateur voit la fiche sans pouvoir la modifier', async ({ page }) => {
    await connecter(page, COMPTES.collab, '/pro/fiche');
    await expect(
      page.getByText('Seuls le propriétaire et le gérant peuvent modifier la fiche.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^Modifier/ })).toHaveCount(0);
  });

  test('le collaborateur dépose une attestation RC Pro', async ({ page }) => {
    await connecter(page, COMPTES.collab, '/pro/fiche');
    await page.getByLabel('Type de document').selectOption('rc_pro');
    await page.getByLabel(/^Fichier/).setInputFiles(PDF);
    await page.getByRole('button', { name: 'Envoyer le document' }).click();
    await expect(page.getByText(/Document reçu/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('list', { name: 'Documents envoyés' })).toContainText(
      'Responsabilité civile professionnelle',
    );
  });
});
