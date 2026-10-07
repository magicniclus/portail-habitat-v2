import { collections } from '@ph/firebase/chemins';
import { expect, test } from '@playwright/test';
import { admin, audits, connecter } from './outils';

// docs/IA_ADMIN.md (lot 13c), sur émulateurs : sans clé API, l'écran le dit et reste utilisable.
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

const ANALYSE = 'e2e-analyse-ia';
const reco = (titre: string, type: string, priorite: number) => ({
  schemaVersion: 1,
  analyseId: ANALYSE,
  titre,
  perimetre: 'landing:acquisition-artisans',
  etape: 'Landing → intérêt',
  gainEstime: '+1 à +2 pts',
  priorite,
  impact: 'élevé',
  effort: 'faible',
  confiance: 0.72,
  constat: '62 % des sorties ont lieu dans la section offres.',
  preuves: [{ source: 'comportementAgregats', ref: 'acquisition-artisans · 30 j', valeur: '62 %' }],
  action: { type, details: 'Monter le comparatif des offres.' },
  statut: 'nouvelle',
});

test.beforeAll(async () => {
  const { db, Timestamp } = await admin();
  const t = Timestamp.now();
  await db.doc(`${collections.iaAnalyses}/${ANALYSE}`).set({
    schemaVersion: 1,
    createdAt: t,
    updatedAt: t,
    mode: 'audit',
    perimetres: ['landings'],
    approfondie: false,
    demandePar: 'admin',
    modele: 'claude-haiku-4-5',
    promptVersion: 'e2e',
    resume: 'Les offres font partir les visiteurs mobiles.',
    etapes: [{ etape: 'Landing → intérêt', score: 48, constat: 'Beaucoup de sorties.' }],
    gainTotal: '+2 à +3,5 points',
    questionsOuvertes: ['Données insuffisantes sur la variante C.'],
    tokensEntree: 1,
    tokensSortie: 1,
    coutCentimes: 3,
    dureeMs: 1,
    cleCache: 'e2e',
    sources: [],
    statut: 'ok',
  });
  await db
    .doc(`${collections.iaRecommandations}/e2e-reco-1`)
    .set({ ...reco('Monter les offres', 'ab_test', 1), createdAt: t, updatedAt: t });
  await db
    .doc(`${collections.iaRecommandations}/e2e-reco-2`)
    .set({ ...reco('Raccourcir le formulaire', 'tache', 2), createdAt: t, updatedAt: t });
});

test('IA-05 : recommandations avec étape, gain et preuves ; actions humaines tracées', async ({
  page,
}) => {
  await connecter(page, 'admin@test.local', `/admin/ia?analyse=${ANALYSE}`, 'admin');
  await expect(page.getByRole('heading', { name: 'Assistant IA', level: 1 })).toBeVisible();
  await expect(page.getByText('L’assistant n’est pas encore actif')).toBeVisible();
  await expect(
    page
      .getByRole('button', { name: 'Lancer l’audit complet' })
      .or(page.getByRole('button', { name: 'Trouver les points d’amélioration' })),
  ).toBeDisabled();
  await expect(
    page.getByText('Gain total estimé si tout est appliqué : +2 à +3,5 points'),
  ).toBeVisible();
  const premiere = page.getByRole('article', { name: 'Monter les offres' });
  await expect(premiere).toContainText('Landing → intérêt');
  await expect(premiere).toContainText('Gain +1 à +2 pts');
  await expect(premiere).toContainText('62 %');
  await premiere.getByRole('button', { name: 'Préparer le test A/B' }).click();
  await expect(premiere).toContainText('En cours');
  const seconde = page.getByRole('article', { name: 'Raccourcir le formulaire' });
  await seconde.getByRole('button', { name: 'Ignorer' }).click();
  await seconde.getByPlaceholder('Pourquoi ? (ne plus proposer…)').fill('déjà fait en 2025');
  await seconde.getByRole('button', { name: 'Ignorer' }).click();
  await expect(seconde).toContainText('Ignorée');
  expect(await audits('adminRecommandationIa', `${collections.iaRecommandations}/e2e-reco-1`)).toBe(
    1,
  );
  const { db } = await admin();
  expect((await db.doc(`${collections.abTests}/ia-e2e-reco-1`).get()).get('statut')).toBe(
    'brouillon',
  );
});

test('« Demander à l’IA » depuis une alerte préremplit la question', async ({ page }) => {
  await connecter(
    page,
    'admin@test.local',
    `/admin/ia?question=${encodeURIComponent('Pourquoi ce clic mort ?')}`,
    'admin',
  );
  await expect(page.getByLabel('Question ou objectif (facultatif)')).toHaveValue(
    'Pourquoi ce clic mort ?',
  );
});

test('réglages de l’assistant : budget en euros enregistré en centimes, avec audit', async ({
  page,
}) => {
  await connecter(page, 'admin@test.local', '/admin/ia', 'admin');
  const reglages = page.getByRole('region', { name: 'Réglages' });
  await reglages.getByLabel('Budget mensuel (€)').fill('12,5');
  await reglages.getByRole('button', { name: 'Enregistrer les réglages' }).click();
  await expect(reglages.getByText('Réglages enregistrés.')).toBeVisible();
  const { db } = await admin();
  expect((await db.doc('config/ia').get()).get('budgetMensuelCentimes')).toBe(1250);
  expect(await audits('adminReglagesIa', 'config/ia')).toBeGreaterThanOrEqual(1);
});
