import { expect, test } from '@playwright/test';
import { admin, connecter } from './outils';

// Session de tournage (STUDIO.md) : préparer la liste, puis tourner à la suite, prompteur compris.
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('STUDIO-SESSION : vidéos à tourner à la suite, prompteur, idées sans clé Claude', async ({
  page,
}) => {
  const { db, Timestamp } = await admin();
  const t = Timestamp.now();
  const script = [
    { voix: 'Artisans, vos clients vous cherchent en ligne.', ecran: 'fiche' },
    { voix: 'Votre fiche est gratuite.', ecran: 'fiche' },
  ];
  const sujet = { titre: 'Session : la fiche gratuite', angle: 'a', dureeCibleS: 30, script };
  for (const id of ['e2e-session-1', 'e2e-session-2'])
    await db.doc(`studioProjets/${id}`).set({
      schemaVersion: 1,
      auteurUid: 'x',
      titre: id === 'e2e-session-1' ? 'Première à tourner' : 'Deuxième à tourner',
      titreAuto: false,
      statut: 'enregistrement',
      format: 'vertical',
      camera: true,
      theme: null,
      serie: null,
      sujets: [sujet],
      sujet,
      prise: null,
      plan: null,
      version: 0,
      captures: {},
      rendu: null,
      erreur: null,
      coutCentimes: 0,
      createdAt: t,
      updatedAt: t,
    });

  await connecter(page, 'admin@test.local', '/admin/studio', 'admin');
  await page
    .getByRole('navigation', { name: 'Sections du Studio' })
    .getByRole('link', { name: 'Tournage' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Session de tournage' })).toBeVisible();
  // Plusieurs thèmes, jusqu'à 10 vidéos chacun (accroches différentes).
  await page.getByLabel('Thème 1 (facultatif)').fill('les demandes gratuites');
  await page.getByLabel('Vidéos du thème 1').selectOption('10');
  await page.getByRole('button', { name: '+ Ajouter un thème' }).click();
  await page.getByLabel('Thème 2', { exact: true }).fill('le devis en 2 minutes');
  await expect(page.getByRole('button', { name: /Trouver les idées \(15 vidéos\)/ })).toBeVisible();
  // Sans clé Claude : le message le dit.
  await page.getByRole('button', { name: /Trouver les idées/ }).click();
  await expect(page.getByText(/ANTHROPIC_API_KEY/)).toBeVisible();
  // Les deux vidéos sont cochées.
  await expect(page.getByRole('checkbox', { name: /Première à tourner/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Deuxième à tourner/ })).toBeChecked();
  await page.getByRole('button', { name: /Commencer la session \(2 vidéos\)/ }).click();
  await expect(page.getByText('Vidéo 1 sur 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: /(Première|Deuxième) à tourner/ })).toBeVisible();
  await expect(page.getByLabel('Prompteur')).toContainText('vos clients vous cherchent');
  await expect(page.getByRole('button', { name: '● Démarrer l’enregistrement' })).toBeVisible();
  const modes = page.getByRole('radiogroup', { name: 'Je filme avec' });
  const defilant = page.getByRole('region', { name: 'Prompteur défilant' });
  // Tout d'une traite : les deux scripts défilent à la suite, une seule vidéo à envoyer.
  await modes.getByRole('radio', { name: 'Tout d’une traite au téléphone' }).click();
  await expect(defilant).toContainText(/Vidéo 1 · (Première|Deuxième) à tourner/);
  await expect(defilant).toContainText(/Vidéo 2 · (Première|Deuxième) à tourner/);
  await expect(page.getByText(/lisez les 2 scripts à la suite/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Envoyer cette vidéo' })).toBeDisabled();
  // Je filme avec mon téléphone, vidéo par vidéo : prompteur qui défile + envoi de la vidéo.
  await modes.getByRole('radio', { name: /Mon téléphone/ }).click();
  await expect(defilant).toContainText('vos clients vous cherchent');
  await expect(defilant).not.toContainText('Vidéo 2 ·');
  await expect(defilant.getByRole('button', { name: '▶ Lancer le défilement' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Envoyer cette vidéo' })).toBeDisabled();
  // Passer : à la dernière vidéo, plus de « tout d'une traite » (une seule reste).
  await page.getByRole('button', { name: 'Passer cette vidéo' }).click();
  await expect(page.getByText('Vidéo 2 sur 2')).toBeVisible();
  await expect(modes.getByRole('radio', { name: 'Tout d’une traite au téléphone' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Passer cette vidéo' }).click();
  await expect(page.getByRole('heading', { name: /Session terminée : 0 vidéo/ })).toBeVisible();
  for (const id of ['e2e-session-1', 'e2e-session-2']) await db.doc(`studioProjets/${id}`).delete();
});
