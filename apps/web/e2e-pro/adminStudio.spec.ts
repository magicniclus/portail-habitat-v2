import { expect, test } from '@playwright/test';
import { connecter } from './outils';

// docs/STUDIO.md, sur émulateurs (sans clés Claude ni YouTube : messages clairs).
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('studio : le bouton « Studio » ouvre l’éditeur ; tout se fait dans le panneau IA', async ({
  page,
}) => {
  await connecter(page, 'admin@test.local', '/admin/studio', 'admin');
  // En-tête du Studio : onglets et « Studio » en haut à droite.
  await expect(page.getByRole('heading', { level: 1, name: 'Vidéos' })).toBeVisible();
  const sections = page.getByRole('navigation', { name: 'Sections du Studio' });
  await expect(sections.getByRole('link', { name: 'Vidéos' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.getByRole('main').getByRole('button', { name: 'Studio', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/studio\/[^/]+\/montage$/);
  const url = page.url();
  const editeur = page.getByRole('dialog', { name: /Éditeur de montage : Nouvelle vidéo/ });
  // Vidéo vide : le panneau IA est ouvert d'office.
  await expect(editeur.getByRole('tab', { name: 'IA', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  // ① L'idée : sans clé Claude, le message le dit.
  await editeur.getByLabel('Thème de la vidéo (facultatif)').fill('les demandes gratuites');
  await editeur.getByRole('button', { name: /Trouver des idées avec Claude/ }).click();
  await expect(editeur.getByText(/ANTHROPIC_API_KEY/)).toBeVisible();
  // ② À partir de quoi : chaque choix s'ouvre sur place.
  const sources = editeur.getByRole('radiogroup', { name: 'À partir de quoi faire la vidéo' });
  await sources.getByRole('radio', { name: /Me filmer/ }).click();
  await expect(editeur.getByLabel('Caméra', { exact: true })).toHaveValue('');
  await expect(editeur.getByRole('button', { name: '● Démarrer l’enregistrement' })).toBeVisible();
  await sources.getByRole('radio', { name: /Ma voix seulement/ }).click();
  // Caméra jamais demandée d'office pour la voix seule.
  await expect(editeur.getByLabel('Caméra', { exact: true })).toHaveValue('aucune');
  await sources.getByRole('radio', { name: /Une vidéo déjà tournée/ }).click();
  await expect(editeur.getByText(/Choisir une vidéo \(.mp4 ou .mov/)).toBeVisible();
  await expect(editeur.getByRole('button', { name: 'Envoyer cette vidéo' })).toBeDisabled();
  await sources.getByRole('radio', { name: /Un audio déjà enregistré/ }).click();
  await expect(editeur.getByText(/Choisir un fichier audio/)).toBeVisible();
  await expect(editeur.getByRole('button', { name: 'Envoyer cette voix' })).toBeDisabled();
  // ElevenLabs : sans clé, le message dit quoi ajouter.
  await sources.getByRole('radio', { name: /Voix IA/ }).click();
  await expect(editeur.getByText(/ELEVENLABS_API_KEY/)).toBeVisible();
  // Sans rien : une durée, voix IA au choix, sous-titres cochés.
  await sources.getByRole('radio', { name: /Sans rien/ }).click();
  await expect(editeur.getByLabel('Durée')).toHaveValue('30');
  const ia = editeur.getByRole('tabpanel', { name: 'Bibliothèque : IA' });
  await expect(ia.getByRole('checkbox', { name: /Sous-titres/ })).toBeChecked();
  await expect(editeur.getByRole('button', { name: 'Créer la vidéo' })).toBeEnabled();
  // ③ Monter soi-même : l'enregistreur des pistes s'ouvre sur place.
  await editeur.getByRole('button', { name: 'Enregistrer sur les pistes' }).click();
  await expect(editeur.getByRole('button', { name: 'Fermer l’enregistreur' })).toBeVisible();

  // Largeurs des panneaux réglables au clavier (et gardées).
  const separateur = editeur.getByRole('separator', { name: 'Largeur de la bibliothèque' });
  const avant = Number(await separateur.getAttribute('aria-valuenow'));
  await separateur.focus();
  await page.keyboard.press('ArrowRight');
  await expect(separateur).toHaveAttribute('aria-valuenow', String(avant + 16));

  // Fermer : retour aux vidéos ; la vidéo encore vide est reprise au prochain clic.
  await editeur.getByRole('button', { name: 'Fermer l’éditeur' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Vidéos' })).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Studio', exact: true }).click();
  await expect(page).toHaveURL(url);
});

test('studio : supprimer une vidéo depuis la grille', async ({ page }) => {
  await connecter(page, 'admin@test.local', '/admin/studio', 'admin');
  await page.getByRole('main').getByRole('button', { name: 'Studio', exact: true }).click();
  await expect(page).toHaveURL(/\/montage$/);
  await page.goto('/admin/studio');
  const corbeilles = page.getByRole('button', { name: /^Supprimer « / });
  const n = await corbeilles.count();
  expect(n).toBeGreaterThan(0);
  page.once('dialog', (d) => void d.accept());
  await corbeilles.first().click();
  await expect(corbeilles).toHaveCount(n - 1);
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
