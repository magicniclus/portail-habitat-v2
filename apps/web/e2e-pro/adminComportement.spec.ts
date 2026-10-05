import { gzipSync } from 'node:zlib';
import { collections } from '@ph/firebase/chemins';
import { expect, test } from '@playwright/test';
import { admin, audits, connecter } from './outils';

// docs/COMPORTEMENT.md §6 (lot 13c), sur émulateurs : cartes, alertes, replays journalisés.
test.skip(({ isMobile }) => isMobile, 'Back-office : vérifié sur ordinateur');

const VUE = 'e2ereplay0000001';

test.beforeAll(async () => {
  const { db, Timestamp } = await admin();
  const maintenant = Timestamp.now();
  const scroll = Array.from({ length: 20 }, (_, i) => Math.round(1234 * (1 - i / 25)));
  await db.doc(`${collections.comportementAgregats}/acquisition-artisans_30j_ordinateur`).set({
    schemaVersion: 1,
    page: 'acquisition-artisans',
    appareil: 'ordinateur',
    periode: '30j',
    jusquAu: '2026-10-04',
    sessions: 1234,
    conversions: 62,
    dureeMediane: 65_000,
    profondeurMediane: 55,
    grilleClics: JSON.stringify({ '30:10': 40, '31:10': 25, '10:40': 3 }),
    grilleAttention: JSON.stringify({ '20:20': 9000 }),
    grilleMouvements: '{}',
    scroll,
    sections: {
      hero: { vues: 1234, lues: 900, tempsTotalMs: 9_000_000, sorties: 120, conversionsSiLue: 50 },
      offres: { vues: 700, lues: 400, tempsTotalMs: 3_000_000, sorties: 300, conversionsSiLue: 20 },
    },
    elements: {
      'cta-premium': { clics: 80, morts: 0, rages: 0, hesitations: 150, survolTotalMs: 90_000 },
      'prix-premium': { clics: 0, morts: 60, rages: 0, hesitations: 0, survolTotalMs: 0 },
    },
    sorties: [
      { section: 'offres', part: 0.71 },
      { section: 'hero', part: 0.29 },
    ],
    sources: { direct: 1234 },
    variantes: { A: 1234 },
    conversionsVariantes: { A: 62 },
    updatedAt: maintenant,
  });
  await db
    .doc(`${collections.comportementAlertes}/acquisition-artisans_clic_mort_prix-premium`)
    .set({
      schemaVersion: 1,
      page: 'acquisition-artisans',
      type: 'clic_mort',
      element: 'prix-premium',
      gravite: 2,
      valeur: 0.049,
      reference: 0.02,
      statut: 'ouverte',
      createdAt: maintenant,
    });
  const chemin = `replays/acquisition-artisans/2026-10-04/${VUE}.json.gz`;
  const { getStorage } = await import('firebase-admin/storage');
  await getStorage()
    .bucket('demo-portail-habitat.appspot.com')
    .file(chemin)
    .save(
      gzipSync(
        JSON.stringify({
          v: 1,
          appareil: 'ordinateur',
          largeur: 1440,
          hauteur: 4000,
          evenements: [
            [0, 0, 100, 100],
            [400, 1, 640, 300],
            [500, 1, 640, 300],
            [600, 1, 640, 300],
            [900, 2, 0, 500],
          ],
        }),
      ),
    );
  await db.doc(`${collections.comportementSessions}/${VUE}`).set({
    schemaVersion: 1,
    sessionId: 'e2esession000001',
    page: 'acquisition-artisans',
    app: 'pro',
    appareil: 'ordinateur',
    duree: 42_000,
    source: 'google.com',
    rages: ['prix-premium'],
    replayPath: chemin,
    aReplay: true,
    createdAt: maintenant,
    expireLe: Timestamp.fromMillis(Date.now() + 86_400_000),
  });
});

test('CMP-03 : cartes, indicateurs et alertes de la page ; suivi d’une alerte', async ({
  page,
}) => {
  await connecter(page, 'admin@test.local', '/admin/comportement', 'admin');
  await expect(
    page.getByRole('heading', { name: 'Comportement des visiteurs', level: 1 }),
  ).toBeVisible();
  const indicateurs = page.getByRole('region', { name: 'Indicateurs' });
  await expect(indicateurs).toContainText('1 234');
  await expect(indicateurs).toContainText('5 %');
  await expect(indicateurs).toContainText('1 min 05');
  await expect(page.getByText('Chargement de la page et calcul des calques…')).toBeHidden({
    timeout: 20_000,
  });
  for (const calque of ['Attention', 'Défilement', 'Clics morts et rage', 'Sorties', 'Clics']) {
    await page.getByRole('button', { name: calque, exact: true }).click();
    await expect(page.getByRole('button', { name: calque, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }
  const alertes = page.getByRole('region', { name: 'Alertes détectées' });
  await expect(alertes).toContainText('4,9 % des visiteurs cliquent dessus');
  await expect(alertes.getByRole('link', { name: 'Demander à l’IA' })).toHaveAttribute(
    'href',
    /\/admin\/ia\?question=/,
  );
  await alertes.getByRole('button', { name: 'Ignorer' }).click();
  await expect(alertes).toContainText('Aucune friction ouverte');
  expect(
    await audits(
      'adminStatutAlerteComportement',
      `${collections.comportementAlertes}/acquisition-artisans_clic_mort_prix-premium`,
    ),
  ).toBe(1);
});

test('replays : liste, lecture et journal de chaque lecture', async ({ page }) => {
  await connecter(page, 'admin@test.local', '/admin/comportement?onglet=replays', 'admin');
  const liste = page.getByRole('region', { name: 'Sessions enregistrées' });
  await liste.getByRole('button', { name: /Clic de rage/ }).click();
  await expect(page.getByRole('button', { name: /Pause|Lire/ }).first()).toBeVisible();
  await expect
    .poll(() => audits('adminLectureReplay', `${collections.comportementSessions}/${VUE}`))
    .toBe(1);
});
