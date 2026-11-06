import { expect, test } from '@playwright/test';
import { connecter } from './outils';

// docs/STUDIO.md, sur émulateurs (sans clés Claude ni YouTube : messages clairs).
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('studio : sans titre, Claude cherche les vidéos à faire ; vertical par défaut', async ({
  page,
}) => {
  await connecter(page, 'admin@test.local', '/admin/studio', 'admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Studio' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Studio' })).toBeVisible();
  await expect(page.getByLabel('Format')).toHaveValue('vertical');
  await expect(page.getByLabel(/Titre/)).toHaveCount(0);
  await page.getByRole('button', { name: /Trouver les meilleures vidéos à faire/ }).click();
  await expect(page).toHaveURL(/\/admin\/studio\/[^/?]+\?analyse=1/);
  await expect(page.getByRole('heading', { level: 1, name: 'Nouvelle vidéo' })).toBeVisible();
  // L'analyse part toute seule ; sans clé Claude, le message le dit.
  await expect(page.getByText(/ANTHROPIC_API_KEY/)).toBeVisible();
  await page.getByRole('button', { name: 'Tourner sans sujet (j’improvise) →' }).click();
  await expect(page.getByText('2. Tournage')).toBeVisible();
  await expect(page.getByRole('button', { name: '● Démarrer l’enregistrement' })).toBeVisible();
  // Caméra jamais demandée d'office ; importer une vidéo du téléphone reste possible.
  await expect(page.getByLabel('Caméra')).toHaveValue('aucune');
  await page.getByRole('tab', { name: /Vidéo du téléphone/ }).click();
  await expect(page.getByText(/Choisir une vidéo \(.mp4 ou .mov/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Envoyer cette vidéo' })).toBeDisabled();
  // Voix seule : un fichier audio suffit.
  await page.getByRole('tab', { name: /Voix seule/ }).click();
  await expect(page.getByText(/Choisir un fichier audio/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Envoyer cette voix' })).toBeDisabled();
  // ElevenLabs : sans clé, le message dit quoi ajouter.
  await page.getByRole('tab', { name: /Voix ElevenLabs/ }).click();
  await expect(page.getByText(/ELEVENLABS_API_KEY/)).toBeVisible();
  // Sans voix ni vidéo : rien à enregistrer, seulement une durée.
  await page.getByRole('tab', { name: /Sans voix ni vidéo/ }).click();
  await expect(page.getByLabel('Durée')).toHaveValue('30');
  await expect(page.getByRole('button', { name: 'Créer la vidéo' })).toBeEnabled();
});

test('studio : partir de son idée', async ({ page }) => {
  await connecter(page, 'admin@test.local', '/admin/studio', 'admin');
  await page.getByText('J’ai déjà une idée').click();
  await page.getByLabel('Votre idée, en quelques mots').fill('Les demandes gratuites de la fiche');
  await page.getByRole('button', { name: 'Partir de mon idée' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Les demandes gratuites de la fiche' }),
  ).toBeVisible();
});

test('studio : refusé sans la permission', async ({ page }) => {
  await connecter(page, 'moderateur@test.local', '/admin/studio', 'admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Studio' })).toHaveCount(0);
});

test('studio : réseaux, calendrier, résultats et séries', async ({ page }) => {
  await connecter(page, 'admin@test.local', '/admin/studio', 'admin');
  await expect(page.getByRole('heading', { name: 'Séries' })).toBeVisible();
  // Sans compte connecté, pas de lecture des commentaires.
  await expect(page.getByRole('button', { name: /Idées tirées de vos commentaires/ })).toHaveCount(
    0,
  );
  await page.getByRole('link', { name: 'Réseaux' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Réseaux' })).toBeVisible();
  for (const r of ['YouTube Shorts', 'Instagram Reels', 'TikTok'])
    await expect(page.getByText(r, { exact: true })).toBeVisible();
  await page.goto('/admin/studio/calendrier');
  await expect(page.getByRole('heading', { level: 1, name: 'Calendrier' })).toBeVisible();
  await expect(page.getByText(/Créneaux conseillés : 14 h 30/)).toBeVisible();
  await page.getByLabel('Objectif par jour').selectOption('3');
  await expect(page).toHaveURL(/parJour=3/);
  await page.goto('/admin/studio/resultats');
  await expect(page.getByText('Pas encore de résultats')).toBeVisible();
});
