import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 3000);
// Sans WebKit installé (poste de dev, conteneur) : PW_CHROMIUM_SEUL=1 émule les iPhone dans Chromium.
const moteur = process.env.PW_CHROMIUM_SEUL === '1' ? { browserName: 'chromium' as const } : {};
// Choix cookies déjà fait (refus) : le bandeau ne masque rien. e2e/cookies.spec.ts part d'un état vide.
const consentement = encodeURIComponent(JSON.stringify({ v: 1, a: 0, le: Date.now() }));

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    locale: 'fr-FR',
    storageState: {
      cookies: [
        {
          name: 'ph_consentement',
          value: consentement,
          domain: 'localhost',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
  },
  // MOBILE.md §11 : iPhone 13, iPhone SE, Pixel 7 et ordinateur.
  projects: [
    { name: 'iphone-13', use: { ...devices['iPhone 13'], ...moteur } },
    { name: 'iphone-se', use: { ...devices['iPhone SE'], ...moteur } },
    { name: 'pixel-7', use: { ...devices['Pixel 7'] } },
    {
      name: 'ordinateur',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `pnpm start --port ${port}`,
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // ANNUAIRE_DEMO : annuaire et fiches servis par le jeu de test en mémoire (jamais en production).
    env: { ACTIVER_ROUTE_TEST_ERREUR: '1', ANNUAIRE_DEMO: '1' },
  },
});
