import { collections } from '@ph/firebase/chemins';
import { expect, test } from '@playwright/test';
import { admin } from './outils';

/** CMP-02 côté serveur : /api/t enregistre un seul résumé par page vue, sans valeur de champ. */
test.use({ storageState: { cookies: [], origins: [] } });

test('CMP-02 : la page vue est enregistrée une fois, sans valeur saisie', async ({ page }) => {
  await page.goto('/pro');
  await page
    .getByRole('region', { name: 'Vos choix sur les cookies' })
    .getByRole('button', { name: 'Tout accepter' })
    .click();
  const sessionId = await page.evaluate(() => sessionStorage.getItem('ph:s'));
  expect(sessionId).toMatch(/^[a-z0-9]{16}$/);
  await page.getByLabel('Email').first().fill('julie.martin@exemple.fr');
  await page.getByRole('heading', { level: 1 }).click();
  // Fin de la page vue : l'onglet passe en arrière-plan puis la page se ferme.
  await page.goto('/aide');

  const { db } = await admin();
  await expect
    .poll(
      async () =>
        (
          await db
            .doc(`${collections.comportementSessions}/_`)
            .parent.where('sessionId', '==', sessionId)
            .get()
        ).docs.map((d) => d.data()),
      { timeout: 10_000 },
    )
    .toEqual([
      expect.objectContaining({
        page: 'acquisition-artisans',
        app: 'pro',
        champs: expect.objectContaining({ email: expect.any(Number) }),
      }),
    ]);
  const docs = await db
    .doc(`${collections.comportementSessions}/_`)
    .parent.where('sessionId', '==', sessionId)
    .get();
  expect(JSON.stringify(docs.docs[0]!.data())).not.toContain('julie.martin');
});
