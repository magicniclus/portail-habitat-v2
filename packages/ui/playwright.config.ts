import { defineConfig, devices } from '@playwright/test';

// Parcourt le Storybook compilé : chaque story, dans les 4 thèmes, à 320 px (MOB-01 à 03 appliqués aux composants).
export default defineConfig({
  testDir: 'catalogue',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:6007',
    viewport: { width: 320, height: 720 },
  },
  webServer: {
    command: 'serve -l 6007 -c ../catalogue/serve.json storybook-static',
    url: 'http://localhost:6007/index.json',
    reuseExistingServer: !process.env.CI,
  },
});
