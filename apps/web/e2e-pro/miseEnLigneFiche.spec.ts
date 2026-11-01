import { chemins } from '@ph/firebase/chemins';
import { expect, test } from '@playwright/test';
import { FieldValue } from 'firebase-admin/firestore';
import { admin, connecter, entrepriseDe, proprietaireAvecPlan } from './outils';

// Fiche complète = logo, description, bannière : en ligne d'elle-même ; interrupteur en haut à
// droite (décision du propriétaire, 01/11/2026).
test('Ma fiche : ce qui manque, mise en ligne automatique, interrupteur « Fiche en ligne »', async ({
  page,
}) => {
  const email = await proprietaireAvecPlan('gratuit');
  const { db } = await admin();
  const artisan = db.doc(chemins.artisan(await entrepriseDe(email)));
  const avant = (await artisan.get()).data()!;
  await artisan.update({
    enLigne: false,
    horsLigneVolontaire: FieldValue.delete(),
    description: '',
    logoUrl: 'https://exemple.fr/l.png',
    bannieres: ['https://exemple.fr/b.png'],
  });
  try {
    await connecter(page, email, '/pro/fiche');
    const interrupteur = page.getByRole('switch', { name: 'Fiche en ligne' });
    await expect(interrupteur).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('progressbar', { name: 'Fiche complétée' })).toHaveAttribute(
      'aria-valuenow',
      '65',
    );
    await expect(page.getByText(/Pour mettre votre fiche en ligne : Présenter/)).toBeVisible();

    // La description complète la fiche : en ligne automatiquement, fiche publique écrite.
    await page.getByRole('button', { name: 'Modifier : À propos' }).click();
    const fenetre = page.getByRole('dialog', { name: 'À propos' });
    await fenetre
      .getByLabel(/^À propos/)
      .fill('Couvreur zingueur à Bordeaux depuis 1998, devis gratuit sous 48 h.');
    await fenetre.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(interrupteur).toHaveAttribute('aria-checked', 'true', { timeout: 15_000 });
    await expect(page.getByRole('progressbar', { name: 'Fiche complétée' })).toHaveCount(0);
    expect((await db.doc(chemins.artisanPublic((await artisan.get()).id)).get()).exists).toBe(true);

    // Éteinte par l'artisan : retirée de l'annuaire.
    await interrupteur.click();
    await expect(interrupteur).toHaveAttribute('aria-checked', 'false', { timeout: 15_000 });
    expect((await artisan.get()).get('horsLigneVolontaire')).toBe(true);
    await interrupteur.click();
    await expect(interrupteur).toHaveAttribute('aria-checked', 'true', { timeout: 15_000 });
  } finally {
    await artisan.update({
      enLigne: avant.enLigne ?? false,
      horsLigneVolontaire: FieldValue.delete(),
      description: avant.description ?? '',
      logoUrl: avant.logoUrl ?? FieldValue.delete(),
      bannieres: avant.bannieres ?? [],
    });
  }
});
