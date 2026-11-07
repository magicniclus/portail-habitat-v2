import { ENCARTS } from '@ph/core/paiements';
import { chemins } from '@ph/firebase/chemins';
import { expect, test } from '@playwright/test';
import { FieldValue } from 'firebase-admin/firestore';
import { admin, connecter, entrepriseDe, proprietaireAvecPlan } from './outils';

// PAIEMENTS §4 : encart contextuel discret, jamais pour une offre incluse, « Plus tard » 30 jours.
test('Ma fiche, numéro masqué : encart Fiche Pro, fenêtre d’offre, « Plus tard » retenu', async ({
  page,
}) => {
  const email = await proprietaireAvecPlan('gratuit');
  const { auth, db } = await admin();
  const uid = (await auth.getUserByEmail(email)).uid;
  const id = await entrepriseDe(email);
  const artisan = db.doc(chemins.artisan(id));
  const enLigne = (await artisan.get()).get('enLigne') as boolean | undefined;
  await artisan.update({ enLigne: true });
  await db.doc(chemins.user(uid)).set({ encartsMasques: FieldValue.delete() }, { merge: true });
  try {
    await connecter(page, email, '/pro/fiche');
    const encart = page.getByText(ENCARTS.coordonnees.texte);
    await expect(encart).toBeVisible();
    // Un seul encart par écran.
    await expect(page.getByText(ENCARTS.realisations.texte)).toHaveCount(0);
    await page.getByRole('button', { name: 'Voir l’offre' }).click();
    await expect(page.getByRole('dialog')).toContainText('Fiche Pro');
    await page.getByRole('dialog').getByRole('button', { name: 'Plus tard' }).click();
    await page.getByRole('button', { name: 'Plus tard' }).click();
    await expect(encart).toHaveCount(0);
    await expect(async () => {
      expect(
        (await db.doc(chemins.user(uid)).get()).get('encartsMasques.coordonnees'),
      ).toBeTruthy();
    }).toPass({ timeout: 10_000 });
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(ENCARTS.coordonnees.texte)).toHaveCount(0);
  } finally {
    await artisan.update({ enLigne: enLigne ?? false });
  }
});
