import { chemins } from '@ph/firebase/chemins';
import { expect, test } from '@playwright/test';
import { FieldValue } from 'firebase-admin/firestore';
import { admin, connecter, entrepriseDe, proprietaireAvecPlan } from './outils';

// Fiche en ligne dès que le SIREN est reconnu, complète ou non (décision du 15/11/2026) ;
// interrupteur en haut à droite de Ma fiche.
test('Ma fiche : ce qui manque, interrupteur « Fiche en ligne » même fiche incomplète', async ({
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
    statut: 'actif',
    sirenReconnu: { par: 'moderateur', le: new Date() },
    'verification.statut': 'verifie',
  });
  try {
    await connecter(page, email, '/pro/fiche');
    const interrupteur = page.getByRole('switch', { name: 'Fiche en ligne' });
    await expect(interrupteur).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('progressbar', { name: 'Fiche complétée' })).toHaveAttribute(
      'aria-valuenow',
      '65',
    );
    await expect(page.getByText(/Pour compléter votre fiche : Présenter/)).toBeVisible();

    // SIREN reconnu : l'interrupteur rallume la fiche, même incomplète.
    await interrupteur.click();
    await expect(interrupteur).toHaveAttribute('aria-checked', 'true', { timeout: 15_000 });
    expect((await db.doc(chemins.artisanPublic((await artisan.get()).id)).get()).exists).toBe(true);

    // Éteinte par l'artisan : retirée de l'annuaire, et le reste après une modification.
    await interrupteur.click();
    await expect(interrupteur).toHaveAttribute('aria-checked', 'false', { timeout: 15_000 });
    expect((await artisan.get()).get('horsLigneVolontaire')).toBe(true);
    await page.getByRole('button', { name: 'Modifier : À propos' }).click();
    const fenetre = page.getByRole('dialog', { name: 'À propos' });
    await fenetre
      .getByLabel(/^À propos/)
      .fill('Couvreur zingueur à Bordeaux depuis 1998, devis gratuit sous 48 h.');
    await fenetre.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByRole('progressbar', { name: 'Fiche complétée' })).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(interrupteur).toHaveAttribute('aria-checked', 'false');
    await interrupteur.click();
    await expect(interrupteur).toHaveAttribute('aria-checked', 'true', { timeout: 15_000 });

    // Fiche publique manquante (déclencheur absent) : recréée à l'ouverture de Ma fiche.
    const publique = db.doc(chemins.artisanPublic(artisan.id));
    await publique.delete();
    await page.reload();
    await expect(page.getByRole('switch', { name: 'Fiche en ligne' })).toBeVisible();
    expect((await publique.get()).exists).toBe(true);
    await expect(page.getByText('Votre fiche n’apparaît pas encore dans l’annuaire')).toHaveCount(
      0,
    );
    // L'interrupteur n'existe que sur Ma fiche (décision du propriétaire, 02/11/2026).
    await page.goto('/pro/tableau-de-bord');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Fiche en ligne' })).toHaveCount(0);
  } finally {
    await artisan.update({
      enLigne: avant.enLigne ?? false,
      horsLigneVolontaire: FieldValue.delete(),
      description: avant.description ?? '',
      logoUrl: avant.logoUrl ?? FieldValue.delete(),
      bannieres: avant.bannieres ?? [],
      statut: avant.statut,
      sirenReconnu: avant.sirenReconnu ?? FieldValue.delete(),
      'verification.statut': avant.verification?.statut ?? 'a_faire',
    });
  }
});
