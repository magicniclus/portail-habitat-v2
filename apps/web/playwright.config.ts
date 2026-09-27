import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure', locale: 'fr-FR' },
  // MOBILE.md §11 : iPhone 13, iPhone SE, Pixel 7 et ordinateur.
  projects: [
    { name: 'iphone-13', use: { ...devices['iPhone 13'] } },
    { name: 'iphone-se', use: { ...devices['iPhone SE'] } },
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
  },
});
