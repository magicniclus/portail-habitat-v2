import { expect, test } from '@playwright/test';
import { admin, connecter } from './outils';

// Suivi de la fabrication (STUDIO.md §6) : étape expliquée, pastille « Vidéo en création » sur
// tout le back-office, « Relancer » quand l'étape dépasse sa durée habituelle.
test('STUDIO-SUIVI : montage en cours visible partout, relance si bloqué', async ({ page }) => {
  const { db, Timestamp } = await admin();
  const doc = db.doc('studioProjets/e2e-suivi');
  await doc.set({
    schemaVersion: 1,
    auteurUid: 'x',
    titre: 'Site en 2 minutes',
    statut: 'montage',
    format: 'vertical',
    camera: false,
    theme: null,
    sujets: [],
    sujet: null,
    // « Claude fait tout » : pas de transcription.
    prise: { id: 'mabc', fichiers: {}, dureeMs: 20000 },
    mots: [],
    plan: null,
    version: 0,
    captures: {},
    rendu: null,
    erreur: null,
    coutCentimes: 14,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // Ailleurs dans le back-office : la pastille suit la vidéo et mène au projet.
  await connecter(page, 'admin@test.local', '/admin/studio', 'admin');
  const pastille = page.getByRole('link', { name: 'Vidéo en création · Montage par Claude' });
  await expect(pastille).toBeVisible();
  await pastille.click();
  await expect(page).toHaveURL(/\/admin\/studio\/e2e-suivi\/montage$/);

  // Sur le projet : ce qui se passe, et pourquoi les captures viennent après.
  await expect(page.getByText('Montage par Claude en cours')).toBeVisible();
  await expect(page.getByText(/le robot ne filme que les écrans choisis ici/)).toBeVisible();
  await expect(page.getByText(/d’habitude 1 à 4 min/)).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Transcription' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Relancer/ })).toHaveCount(0);

  // Bloqué depuis 13 min : on peut relancer.
  await doc.update({ updatedAt: Timestamp.fromMillis(Date.now() - 13 * 60_000) });
  await page.reload();
  await expect(page.getByText('C’est plus long que d’habitude')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Relancer cette étape' })).toBeVisible();
  await doc.delete();
});
