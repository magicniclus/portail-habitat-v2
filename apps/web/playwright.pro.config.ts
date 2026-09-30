import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/**
 * Espace pro de bout en bout sur les émulateurs Firebase et le jeu de test (`pnpm e2e:pro` à la
 * racine) : vraie connexion, vraies règles de sécurité, les 4 rôles du seed (PLAN_DEV, lot 10).
 */
const port = 3200;
const moteur = process.env.PW_CHROMIUM_SEUL === '1' ? { browserName: 'chromium' as const } : {};

export default defineConfig({
  ...base,
  testDir: 'e2e-pro',
  // Les tests partagent les données du seed : pas de parallélisme entre fichiers qui écrivent.
  fullyParallel: false,
  workers: 1,
  use: { ...base.use, baseURL: `http://localhost:${port}` },
  projects: [
    { name: 'iphone-13', use: { ...devices['iPhone 13'], ...moteur } },
    {
      name: 'ordinateur',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `pnpm start --port ${port}`,
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    // Émulateurs hérités de `firebase emulators:exec` (FIRESTORE_EMULATOR_HOST…).
    // Secret de test du webhook Stripe (e2e seulement) : les événements sont signés par le test.
    env: { APP_CHECK_MODE: 'desactive', STRIPE_WEBHOOK_SECRET: 'whsec_e2e_local' },
  },
});
