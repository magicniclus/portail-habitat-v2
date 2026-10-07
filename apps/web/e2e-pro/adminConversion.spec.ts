import { expect, test, type Page } from '@playwright/test';
import { admin, audits, COMPTES, connecter, entrepriseDe } from './outils';

// docs/ADMIN.md §2.8b et CONVERSION.md §9 (lot 13b), sur émulateurs.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

async function confirmer(page: Page, titre: string, motif: string) {
  const dialogue = page.getByRole('dialog', { name: titre });
  await dialogue.getByLabel('Motif (obligatoire)').fill(motif);
  await dialogue.getByText('Je confirme cette action').click();
  await dialogue.getByRole('button', { name: 'Confirmer' }).click();
  await expect(dialogue).toBeHidden();
}

test('CONV-05 : créer, modifier, dupliquer, mettre en pause et supprimer une séquence', async ({
  page,
}) => {
  await connecter(page, 'admin@test.local', '/admin/conversion/sequences', 'admin');
  await expect(page.getByRole('heading', { name: 'S4 · Gratuit → Visibilité' })).toBeVisible();

  await page.getByRole('button', { name: '+ Nouvelle séquence' }).click();
  const editeur = page.getByRole('dialog', { name: 'Nouvelle séquence' });
  await editeur.getByLabel('Nom').fill('Relance de test');
  await editeur.getByLabel('Objectif (sortie automatique)').fill('1er paiement');
  await editeur.getByRole('button', { name: '+ Ajouter une étape' }).click();
  await editeur.getByLabel('Motif (obligatoire)').fill('Création pour le test');
  await editeur.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(editeur).toBeHidden();
  const carte = page.getByRole('heading', { name: /· Relance de test$/ });
  await expect(carte).toBeVisible();
  const id = ((await carte.textContent()) ?? '').split(' · ')[0]!;
  const bloc = page.getByRole('region', { name: `Séquence ${id}` });

  await bloc.getByRole('button', { name: 'Modifier' }).click();
  const modif = page.getByRole('dialog', { name: `Modifier ${id}` });
  await modif.getByLabel('Nom').fill('Relance de test v2');
  await modif.getByLabel('Motif (obligatoire)').fill('Changement de nom');
  await modif.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(modif).toBeHidden();
  await expect(page.getByRole('heading', { name: `${id} · Relance de test v2` })).toBeVisible();

  await bloc.getByRole('button', { name: 'Réactiver' }).click();
  await confirmer(page, `Réactiver ${id}`, 'Mise en service');
  await bloc.getByRole('button', { name: 'Dupliquer' }).click();
  await confirmer(page, `Dupliquer ${id}`, 'Variante à tester');
  await expect(page.getByRole('heading', { name: /Relance de test v2 \(copie\)$/ })).toBeVisible();

  await bloc.getByRole('button', { name: 'Supprimer' }).click();
  const suppr = page.getByRole('dialog', { name: `Supprimer ${id} ?` });
  await suppr.getByLabel(`Tapez ${id} pour confirmer`).fill(id);
  await confirmer(page, `Supprimer ${id} ?`, 'Séquence de test terminée');
  await expect(page.getByRole('heading', { name: `${id} · Relance de test v2` })).toBeHidden();

  const cible = `sequences/${id}`;
  expect(await audits('adminSequenceCreer', cible)).toBe(1);
  expect(await audits('adminSequenceModifier', cible)).toBe(2);
  expect(await audits('adminSequenceSupprimer', cible)).toBe(1);
});

test('CONV-06 : sans conversion.configurer, les boutons de séquence sont désactivés', async ({
  page,
}) => {
  await connecter(page, 'lecture@test.local', '/admin/conversion/sequences', 'admin');
  const nouvelle = page.getByRole('button', { name: '+ Nouvelle séquence' });
  await expect(nouvelle).toBeDisabled();
  await expect(nouvelle).toHaveAttribute('title', 'Permission requise : conversion.configurer');
  await expect(page.getByRole('button', { name: 'Supprimer' }).first()).toBeDisabled();
  await page.goto('/admin/conversion/reglages');
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
});

test('vue d’ensemble, journal et réglages', async ({ page }) => {
  await connecter(page, 'admin@test.local', '/admin/conversion', 'admin');
  await expect(page.getByText('Entreprises par étape')).toBeVisible();
  const onglets = page.getByRole('navigation', { name: 'Conversion' });
  await onglets.getByRole('link', { name: 'Journal' }).click();
  await expect(page.getByRole('link', { name: 'Non-envois' })).toBeVisible();
  await onglets.getByRole('link', { name: 'Réglages' }).click();
  await page.getByLabel('Emails offres_pro max. par semaine').fill('1');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await confirmer(page, 'Enregistrer les réglages', 'Pression réduite pour le test');
  expect(await audits('adminReglagesCycle', 'config/cycle')).toBeGreaterThan(0);
});

test('journal en direct : une nouvelle décision apparaît sans recharger ; export CSV journalisé', async ({
  page,
}) => {
  await connecter(page, 'admin@test.local', '/admin/conversion/journal?filtre=tous', 'admin');
  await expect(page.getByText('En direct')).toBeVisible();
  const { db, Timestamp } = await admin();
  const artisanId = await entrepriseDe(COMPTES.proprio);
  const ref = await db.collection('cycleTraces').add({
    schemaVersion: 1,
    artisanId,
    type: 'email_bloque',
    raison: 'pression',
    modele: 'vis-test-direct',
    details: {},
    function: 'e2e',
    createdAt: Timestamp.now(),
    expireLe: Timestamp.fromMillis(Date.now() + 86_400_000),
  });
  try {
    await expect(page.getByRole('cell', { name: 'vis-test-direct' })).toBeVisible();
    const telechargement = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Exporter en CSV' }).click();
    const chemin = await (await telechargement).path();
    const { readFile } = await import('node:fs/promises');
    const csv = await readFile(chemin, 'utf8');
    expect(csv.split('\r\n')[0]).toBe('date;entreprise;type;modele;raison;fonction;details');
    expect(csv).toContain('vis-test-direct');
    expect(await audits('adminExportJournalConversion', 'cycleTraces')).toBeGreaterThan(0);
  } finally {
    await ref.delete();
  }
});
