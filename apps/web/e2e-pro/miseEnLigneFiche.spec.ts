import { chemins } from '@ph/firebase/chemins';
import { expect, test } from '@playwright/test';
import { FieldValue } from 'firebase-admin/firestore';
import { admin, connecter, entrepriseDe, proprietaireAvecPlan } from './outils';

// Fiche complète = logo, description, bannière (décision du propriétaire, 01/11/2026).
test('Ma fiche : ce qui manque sous la barre, puis « Mettre ma fiche en ligne »', async ({
  page,
}) => {
  const email = await proprietaireAvecPlan('gratuit');
  const { db } = await admin();
  const artisan = db.doc(chemins.artisan(await entrepriseDe(email)));
  const avant = (await artisan.get()).data()!;
  await artisan.update({
    enLigne: false,
    description: 'Couvreur zingueur à Bordeaux depuis 1998, devis gratuit sous 48 h.',
    logoUrl: FieldValue.delete(),
    bannieres: [],
  });
  try {
    await connecter(page, email, '/pro/fiche');
    await expect(page.getByRole('progressbar', { name: 'Fiche complétée' })).toHaveAttribute(
      'aria-valuenow',
      '35',
    );
    await expect(page.getByText(/Ajouter votre logo · Ajouter une bannière/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mettre ma fiche en ligne' })).toHaveCount(0);

    await artisan.update({
      logoUrl: avant.logoUrl ?? 'https://exemple.fr/l.png',
      bannieres: ['https://exemple.fr/b.png'],
    });
    await page.reload();
    await expect(page.getByRole('progressbar', { name: 'Fiche complétée' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Mettre ma fiche en ligne' }).click();
    await expect(page.getByRole('button', { name: 'Mettre ma fiche en ligne' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Voir ma fiche publique' })).toBeVisible();
    expect((await artisan.get()).get('enLigne')).toBe(true);
  } finally {
    await artisan.update({
      enLigne: avant.enLigne ?? false,
      description: avant.description ?? '',
      logoUrl: avant.logoUrl ?? FieldValue.delete(),
      bannieres: avant.bannieres ?? [],
    });
  }
});
