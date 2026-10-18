import { collections } from '@ph/firebase/chemins';
import { expect, test } from '@playwright/test';
import {
  admin,
  audits,
  COMPTES,
  connecter,
  deposerDocument,
  entrepriseDe,
  entrepriseSansCompteFixe,
} from './outils';

// docs/ACCEPTANCE.md ADM-02 à ADM-04 (back-office, section Artisans), sur émulateurs.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

test('ADM-02 : coordonnées masquées ; « Afficher » écrit une entrée d’audit ; rien pour le rôle lecture', async ({
  page,
}) => {
  const { id } = await entrepriseSansCompteFixe(0);
  await connecter(page, 'admin@test.local', `/admin/artisans?id=${id}`, 'admin');
  const fiche = page.getByRole('region', { name: /Fiche de/ });
  const telephone = fiche.locator('dd').filter({ hasText: '•' }).first();
  await expect(telephone).toContainText('•');
  const avant = await audits('pii.afficher', `artisans/${id}`);
  await fiche.getByRole('button', { name: 'Afficher' }).first().click();
  await expect(fiche.getByRole('button', { name: 'Afficher' })).toHaveCount(0);
  await expect.poll(() => audits('pii.afficher', `artisans/${id}`)).toBe(avant + 1);

  await page.context().clearCookies();
  await connecter(page, 'lecture@test.local', `/admin/artisans?id=${id}`, 'admin');
  await expect(fiche.locator('dd').filter({ hasText: '•' }).first()).toBeVisible();
  await expect(fiche.getByRole('button', { name: 'Afficher' })).toHaveCount(0);
  await expect(fiche.getByRole('button', { name: 'Suspendre' })).toHaveCount(0);
});

test('ADM-03 : suspendre exige un motif et une confirmation, puis lever la suspension', async ({
  page,
}) => {
  const { id, nom } = await entrepriseSansCompteFixe(1);
  await connecter(page, 'admin@test.local', `/admin/artisans?id=${id}`, 'admin');
  const fiche = page.getByRole('region', { name: `Fiche de ${nom}` });
  await fiche.getByRole('button', { name: 'Suspendre' }).click();
  const dialogue = page.getByRole('dialog', { name: `Suspendre ${nom}` });
  const confirmer = dialogue.getByRole('button', { name: 'Confirmer' });
  await expect(confirmer).toBeDisabled();
  await dialogue.getByLabel('Motif (obligatoire)').fill('SIREN radié');
  await expect(confirmer).toBeDisabled();
  await dialogue.getByText('Je confirme cette action').click();
  await confirmer.click();
  await expect(fiche.getByRole('button', { name: 'Lever la suspension' })).toBeVisible();
  await expect.poll(() => audits('adminSanctionner', `artisans/${id}`)).toBe(1);

  await fiche.getByRole('button', { name: 'Lever la suspension' }).click();
  const lever = page.getByRole('dialog', { name: `Lever la suspension de ${nom}` });
  await lever.getByLabel('Motif (obligatoire)').fill('Kbis à jour');
  await lever.getByText('Je confirme cette action').click();
  await lever.getByRole('button', { name: 'Confirmer' }).click();
  await expect(fiche.getByRole('button', { name: 'Suspendre' })).toBeVisible();
});

test('ADM-04 : « voir en tant que » : bandeau rouge et toute écriture échoue', async ({ page }) => {
  const artisanId = await entrepriseDe(COMPTES.proprio);
  await connecter(page, 'admin@test.local', `/admin/artisans?id=${artisanId}`, 'admin');
  await page.getByRole('button', { name: 'Voir en tant que' }).click();
  const dialogue = page.getByRole('dialog', { name: /Voir l’espace de/ });
  await dialogue.getByLabel('Motif (obligatoire)').fill('Ticket support 42');
  await dialogue.getByText('Je confirme cette action').click();
  await dialogue.getByRole('button', { name: 'Confirmer' }).click();
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord/);
  await expect(page.getByRole('alert').filter({ hasText: 'voir en tant que' })).toBeVisible();
  const r = await page.evaluate(async () => {
    const res = await fetch('/api/pro/demandes/prendre', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ demandeId: 'inexistante' }),
    });
    return (await res.json()) as { ok: boolean; message?: string };
  });
  expect(r).toMatchObject({ ok: false, message: expect.stringContaining('voir en tant que') });
});

test('documents : le modérateur valide une décennale ; la tâche quitte la file ; note interne', async ({
  page,
}) => {
  const { id, nom } = await entrepriseSansCompteFixe(3);
  await deposerDocument(id);
  await connecter(
    page,
    'moderateur@test.local',
    `/admin/artisans?id=${id}&onglet=documents`,
    'admin',
  );
  const fiche = page.getByRole('region', { name: `Fiche de ${nom}` });
  await expect(fiche.getByText('à vérifier')).toBeVisible();
  await fiche.getByRole('button', { name: 'Valider' }).click();
  const dialogue = page.getByRole('dialog', { name: /Valider :/ });
  await dialogue.getByLabel('Valable jusqu’au (si indiqué sur le document)').fill('2027-06-30');
  await dialogue.getByLabel('Motif (obligatoire)').fill('Attestation lisible et à jour');
  await dialogue.getByText('Je confirme cette action').click();
  await dialogue.getByRole('button', { name: 'Confirmer' }).click();
  await expect(fiche.getByText('validé')).toBeVisible();
  await page.goto('/admin/file');
  await expect(page.getByRole('listitem').filter({ hasText: nom })).toHaveCount(0);

  await page.goto(`/admin/artisans?id=${id}&onglet=notes`);
  await page.getByLabel('Nouvelle note interne').fill('Décennale vérifiée au téléphone.');
  await page.getByRole('button', { name: 'Ajouter la note' }).click();
  await expect(page.getByText('Décennale vérifiée au téléphone.')).toBeVisible();
});

test('entreprise créée par l’admin : non revendiquée, fiche recalculée, puis suppression définitive', async ({
  page,
}) => {
  const siren = '732829320';
  const { db, Timestamp } = await admin();
  // Résultat SIRENE en cache : aucun appel au répertoire pendant le test.
  await db.doc(`${collections.cacheSirene}/${siren}`).set({
    schemaVersion: 1,
    donnees: {
      siren,
      siret: `${siren}00017`,
      raisonSociale: 'ZINGUERIE E2E SARL',
      nomCommercial: 'Zinguerie E2E',
      fermee: false,
      adresse: {
        ligne1: '3 quai des Chartrons',
        codePostal: '33000',
        ville: 'Bordeaux',
        geo: { latitude: 44.85, longitude: -0.57 },
      },
    },
    createdAt: Timestamp.now(),
    expireLe: Timestamp.fromMillis(Date.now() + 86_400_000),
  });
  await db.doc(`${collections.sirenIndex}/${siren}`).delete();

  await connecter(page, 'admin@test.local', '/admin/artisans?q=Zinguerie', 'admin');
  await page.getByRole('button', { name: 'Créer une entreprise' }).click();
  const creer = page.getByRole('dialog', { name: 'Créer une entreprise non revendiquée' });
  await creer.getByLabel('SIREN').fill(siren);
  await creer.getByLabel('Motif (obligatoire)').fill('Partenariat chambre des métiers');
  await creer.getByText('Je confirme cette action').click();
  await creer.getByRole('button', { name: 'Confirmer' }).click();
  await expect(creer).toBeHidden();
  const artisanId = (await db.doc(`${collections.sirenIndex}/${siren}`).get()).get(
    'artisanId',
  ) as string;
  expect(await audits('adminCreerEntreprise', `artisans/${artisanId}`)).toBe(1);

  await page.goto(`/admin/artisans?id=${artisanId}`);
  const fiche = page.getByRole('region', { name: 'Fiche de Zinguerie E2E' });
  await expect(fiche.getByRole('button', { name: 'Inviter à revendiquer' })).toBeVisible();
  await fiche.getByRole('button', { name: 'Recalculer la fiche publique' }).click();
  await expect(fiche.getByText('Fiche retirée de l’annuaire (hors ligne).')).toBeVisible();

  await fiche.getByRole('button', { name: 'Supprimer définitivement' }).click();
  const supprimer = page.getByRole('dialog', { name: 'Supprimer définitivement Zinguerie E2E' });
  await supprimer.getByLabel('Saisissez « Zinguerie E2E » pour confirmer').fill('Zinguerie E2E');
  await supprimer.getByLabel('Motif (obligatoire)').fill('Créée par erreur');
  await supprimer.getByText('Je confirme cette action').click();
  await supprimer.getByRole('button', { name: 'Confirmer' }).click();
  await expect(supprimer).toBeHidden();
  expect((await db.doc(`${collections.artisans}/${artisanId}`).get()).get('statut')).toBe(
    'supprime',
  );
  expect((await db.doc(`${collections.sirenIndex}/${siren}`).get()).exists).toBe(false);
});
