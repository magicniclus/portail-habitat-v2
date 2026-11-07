import { expect, test } from '@playwright/test';
import { admin, connecter } from './outils';

// Éditeur de montage façon logiciel de montage (STUDIO.md, « Éditeur ») : ajouter un élément,
// glisser un plan dans la frise, annuler. Gestes à la souris : ordinateur seulement.
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

test('STUDIO-EDIT : ajouter un texte, déplacer un plan, annuler', async ({ page }) => {
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
  // L'éditeur s'ouvre en plein écran : tout tient dans la fenêtre, sans défiler.
  const editeur = page.getByRole('dialog', { name: /Éditeur de montage/ });
  await expect(editeur).toBeVisible();
  await expect(editeur.getByRole('button', { name: /Plan 1 : 24 h/ })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1),
  ).toBe(true);
  const enregistrer = editeur.getByRole('button', { name: /Enregistrer et fabriquer/ });
  await expect(enregistrer).toBeDisabled();

  // Bibliothèque › Texte : un clic pose un titre à la tête de lecture, réglable à droite.
  await editeur.getByRole('tab', { name: 'Texte' }).click();
  await editeur.getByRole('button', { name: 'Titre' }).click();
  await expect(editeur.getByLabel('Texte', { exact: true })).toHaveValue('Votre texte');
  await editeur.getByLabel('Texte', { exact: true }).fill('Regardez bien');
  await expect(editeur.getByRole('button', { name: /Texte : Regardez bien/ })).toBeVisible();

  // Glisser le plan 3 tout au début de la frise.
  const p3 = editeur.getByRole('button', { name: /Plan 3 :/ });
  const b = (await p3.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x - 900, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(editeur.getByRole('button', { name: /Plan 1 : Gratuit/ })).toBeVisible();

  // Annuler remet l'ordre d'avant ; le texte ajouté reste, donc on peut enregistrer.
  await editeur.getByRole('button', { name: /Annuler/ }).click();
  await expect(editeur.getByRole('button', { name: /Plan 1 : 24 h/ })).toBeVisible();
  await expect(enregistrer).toBeEnabled();

  // Raccourcis : S scinde à la tête de lecture (placée à 2 s avec → ×20).
  await editeur.getByRole('button', { name: /Plan 1 : 24 h/ }).click();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('s');
  await expect(editeur.getByRole('button', { name: /^Plan \d/ })).toHaveCount(4);
  // Fermer : on retrouve la page de l'étape, avec de quoi rouvrir l'éditeur.
  // Modifications non enregistrées : on demande avant de les perdre.
  page.once('dialog', (d) => void d.accept());
  await editeur.getByRole('button', { name: 'Fermer l’éditeur' }).click();
  await expect(editeur).toBeHidden();
  await page.getByRole('button', { name: 'Ouvrir l’éditeur' }).click();
  await expect(page.getByRole('dialog', { name: /Éditeur de montage/ })).toBeVisible();
  await page.screenshot({ path: process.env.CAPTURE_EDITEUR ?? 'test-results/editeur.png' });
});
