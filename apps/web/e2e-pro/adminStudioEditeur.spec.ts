import { expect, test } from '@playwright/test';
import { admin, connecter } from './outils';

// Éditeur de montage multipistes (STUDIO.md §5 bis) avec un montage de Claude converti en pistes. Gestes à la souris : ordinateur seulement.
test.skip(({ isMobile }) => isMobile, 'gestes de la frise à la souris');

const plan = {
  format: 'vertical',
  titre: 'Test',
  sousTitres: false,
  musique: true,
  artisan: null,
  captures: [{ id: 'c1', scene: 'fiche_publique' }],
  plans: [
    {
      id: 'p1',
      source: { debut: 0, fin: 4000 },
      visuel: 'carton',
      carton: '24 h. 0 €. 3 chantiers.',
      camera: 'cachee',
      calques: [
        {
          type: 'texte',
          texte: 'Pari tenu ?',
          style: 'accroche',
          position: 'haut',
          debut: 0,
          fin: 2000,
        },
      ],
    },
    {
      id: 'p2',
      source: { debut: 4000, fin: 12000 },
      visuel: 'capture',
      captureId: 'c1',
      camera: 'cachee',
      calques: [],
    },
    {
      id: 'p3',
      source: { debut: 12000, fin: 18000 },
      visuel: 'carton',
      carton: 'Gratuit sur portailtravaux.fr',
      camera: 'cachee',
      calques: [],
    },
  ],
};

test('STUDIO-EDIT : montage de Claude dans l’éditeur multipistes, écrans, IA, enregistrer, fabriquer', async ({
  page,
}) => {
  const { db, Timestamp } = await admin();
  const t = Timestamp.now();
  await db.doc('studioProjets/e2e-editeur').set({
    schemaVersion: 1,
    auteurUid: 'x',
    titre: 'Défi 24 h',
    statut: 'pret',
    format: 'vertical',
    camera: false,
    theme: null,
    sujets: [],
    sujet: null,
    prise: { id: 'm1', fichiers: {}, dureeMs: 20000 },
    mots: [],
    plan,
    version: 1,
    captures: {},
    rendu: null,
    erreur: null,
    coutCentimes: 0,
    createdAt: t,
    updatedAt: t,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await connecter(page, 'admin@test.local', '/admin/studio/e2e-editeur', 'admin');
  // Le montage de Claude s'ouvre dans l'éditeur multipistes, en plein écran, sans défiler.
  const editeur = page.getByRole('dialog', { name: /Éditeur de montage/ });
  await expect(editeur).toBeVisible();
  await expect(editeur.getByRole('button', { name: 'Clip 24 h. 0 €. 3 chantiers.' })).toBeVisible();
  await expect(
    editeur.getByRole('button', { name: 'Clip La fiche de l’artisan, vue par un particulier' }),
  ).toBeVisible();
  await expect(editeur.getByRole('button', { name: 'Clip Texte' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1),
  ).toBe(true);

  // Onglet Écrans : un clic pose l'écran de Portail Travaux à la tête de lecture.
  await editeur.getByRole('tab', { name: 'Écrans' }).click();
  await editeur
    .getByRole('button', { name: /La fiche de l’artisan.*Dans la vidéo, à filmer/ })
    .click();
  await expect(
    editeur.getByRole('button', { name: 'Clip La fiche de l’artisan, vue par un particulier' }),
  ).toHaveCount(2);

  // Onglet IA : la retouche par Claude est proposée pour un montage de Claude.
  await editeur.getByRole('tab', { name: 'IA', exact: true }).click();
  await expect(editeur.getByLabel('Revoir avec Claude')).toBeVisible();

  // Couper le premier carton avec S (tête à 2 s), annuler, enregistrer.
  await editeur.getByRole('button', { name: 'Clip 24 h. 0 €. 3 chantiers.' }).click();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('s');
  await expect(editeur.getByRole('button', { name: 'Clip 24 h. 0 €. 3 chantiers.' })).toHaveCount(
    2,
  );
  await editeur.getByRole('button', { name: /Annuler/ }).click();
  await expect(editeur.getByRole('button', { name: 'Clip 24 h. 0 €. 3 chantiers.' })).toHaveCount(
    1,
  );
  await editeur.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(
    editeur.getByRole('status').filter({ hasText: 'Montage enregistré.' }),
  ).toBeVisible();
  const p = (await db.doc('studioProjets/e2e-editeur').get()).data()!;
  expect(p.friseVersion).toBe(1);
  expect(p.frise.captures).toEqual([{ id: 'c1', scene: 'fiche_publique' }]);

  // Fabriquer : l'écran pas encore filmé part d'abord chez le robot (absent des tests : le
  // projet passe « À relancer » à l'étape des captures, avec la raison).
  await editeur.getByRole('button', { name: 'Enregistrer et fabriquer' }).click();
  await expect(editeur.getByRole('status').filter({ hasText: /en fabrication/ })).toBeVisible();
  await expect
    .poll(async () => (await db.doc('studioProjets/e2e-editeur').get()).get('erreur'))
    .toMatch(/robot de rendu n’est pas configuré/);

  // Fermer : retour aux vidéos ; un clic sur la carte rouvre directement le Studio.
  await editeur.getByRole('button', { name: 'Fermer l’éditeur' }).click();
  await expect(page).toHaveURL(/\/admin\/studio$/);
  await page.locator('a[href="/admin/studio/e2e-editeur/montage"]').click();
  await expect(page.getByRole('dialog', { name: /Éditeur de montage/ })).toBeVisible();
  await page.screenshot({ path: process.env.CAPTURE_EDITEUR ?? 'test-results/editeur.png' });
});
