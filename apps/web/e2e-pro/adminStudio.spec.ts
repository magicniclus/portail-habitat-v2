import { expect, test } from '@playwright/test';
import { connecter } from './outils';

// docs/STUDIO.md, sur émulateurs (sans clés Claude ni YouTube : messages clairs).
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('studio : sans titre, Claude cherche les vidéos à faire ; vertical par défaut', async ({
  page,
}) => {
  await connecter(page, 'admin@test.local', '/admin/studio', 'admin');
  // En-tête du Studio : onglets, « Nouvelle vidéo » et « Studio » en haut à droite.
  await expect(page.getByRole('heading', { level: 1, name: 'Vidéos' })).toBeVisible();
  const sections = page.getByRole('navigation', { name: 'Sections du Studio' });
  await expect(sections.getByRole('link', { name: 'Vidéos' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Studio', exact: true }),
  ).toBeVisible();
  // « Nouvelle vidéo » : trois façons de commencer ; vertical par défaut.
  await page.getByRole('button', { name: 'Nouvelle vidéo' }).click();
  const nouvelle = page.getByRole('dialog', { name: 'Nouvelle vidéo' });
  await expect(nouvelle.getByLabel('Format')).toHaveValue('vertical');
  for (const t of ['Trouver une idée avec Claude', 'Partir de mon idée', 'Monter moi-même'])
    await expect(nouvelle.getByRole('heading', { name: t })).toBeVisible();
  await nouvelle.getByRole('button', { name: /Trouver les meilleures vidéos à faire/ }).click();
  await expect(page).toHaveURL(/\/admin\/studio\/[^/?]+\/idees\?analyse=1/);
  await expect(page.getByRole('heading', { level: 1, name: 'Nouvelle vidéo' })).toBeVisible();
  // Une page par étape : les suivantes restent fermées tant que l'idée n'est pas choisie.
  const etapes = page.getByRole('navigation', { name: 'Étapes de la vidéo' });
  await expect(etapes.getByRole('link', { name: /Idée et script/ })).toHaveAttribute(
    'aria-current',
    'step',
  );
  await expect(etapes.getByRole('link', { name: /Tournage/ })).toHaveCount(0);
  // L'analyse part toute seule ; sans clé Claude, le message le dit.
  await expect(page.getByText(/ANTHROPIC_API_KEY/)).toBeVisible();
  await page.getByRole('button', { name: 'Aller au Studio sans idée (j’improvise) →' }).click();
  // Idée choisie : on arrive dans le Studio. Tournage : enregistrer ici, ou tourner avec le
  // script en prompteur et laisser Claude monter.
  await expect(page).toHaveURL(/\/montage$/);
  await expect(etapes.getByRole('link', { name: /Idée et script/ })).toBeVisible();
  const editeur = page.getByRole('dialog', { name: /Éditeur de montage/ });
  await editeur.getByRole('tab', { name: 'Tournage' }).click();
  await expect(editeur.getByRole('button', { name: /Enregistrer ici/ })).toBeVisible();
  await editeur.getByRole('button', { name: /Tourner, Claude monte/ }).click();
  const tournage = page.getByRole('dialog', { name: 'Tourner, Claude monte' });
  await expect(tournage.getByRole('button', { name: '● Démarrer l’enregistrement' })).toBeVisible();
  // Caméra jamais demandée d'office ; importer une vidéo du téléphone reste possible.
  await expect(tournage.getByLabel('Caméra')).toHaveValue('aucune');
  await tournage.getByRole('tab', { name: /Vidéo du téléphone/ }).click();
  await expect(tournage.getByText(/Choisir une vidéo \(.mp4 ou .mov/)).toBeVisible();
  await expect(tournage.getByRole('button', { name: 'Envoyer cette vidéo' })).toBeDisabled();
  // Voix seule : un fichier audio suffit.
  await tournage.getByRole('tab', { name: /Voix seule/ }).click();
  await expect(tournage.getByText(/Choisir un fichier audio/)).toBeVisible();
  await expect(tournage.getByRole('button', { name: 'Envoyer cette voix' })).toBeDisabled();
  // ElevenLabs : sans clé, le message dit quoi ajouter.
  await tournage.getByRole('tab', { name: /Voix ElevenLabs/ }).click();
  await expect(tournage.getByText(/ELEVENLABS_API_KEY/)).toBeVisible();
  // Claude fait tout : rien à tourner, une durée, voix IA au choix, sous-titres cochés.
  await tournage.getByRole('tab', { name: /Claude fait tout/ }).click();
  await expect(tournage.getByLabel('Voix')).toHaveValue('');
  await expect(tournage.getByLabel('Durée')).toHaveValue('30');
  await expect(tournage.getByRole('checkbox', { name: /Sous-titres/ })).toBeChecked();
  await expect(tournage.getByRole('button', { name: 'Créer la vidéo' })).toBeEnabled();
});

test('studio : partir de son idée', async ({ page }) => {
  await connecter(page, 'admin@test.local', '/admin/studio', 'admin');
  await page.getByRole('button', { name: 'Nouvelle vidéo' }).click();
  const nouvelle = page.getByRole('dialog', { name: 'Nouvelle vidéo' });
  await nouvelle
    .getByLabel('Votre idée, en quelques mots')
    .fill('Les demandes gratuites de la fiche');
  await nouvelle.getByRole('button', { name: 'Partir de mon idée' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Les demandes gratuites de la fiche' }),
  ).toBeVisible();
});

test('studio : refusé sans la permission', async ({ page }) => {
  await connecter(page, 'moderateur@test.local', '/admin/studio', 'admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Vidéos' })).toHaveCount(0);
});

test('studio : réseaux, calendrier, résultats et séries', async ({ page }) => {
  await connecter(page, 'admin@test.local', '/admin/studio', 'admin');
  const sections = page.getByRole('navigation', { name: 'Sections du Studio' });
  await sections.getByRole('link', { name: 'Idées' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Idées' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Séries' })).toBeVisible();
  // Sans compte connecté, pas de lecture des commentaires.
  await expect(page.getByRole('button', { name: /Idées tirées de vos commentaires/ })).toHaveCount(
    0,
  );
  await sections.getByRole('link', { name: 'Réseaux' }).click();
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
