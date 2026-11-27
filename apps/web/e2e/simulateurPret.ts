import type { Page } from '@playwright/test';

/**
 * Ouvre le simulateur et attend qu'il soit interactif : rendu par le serveur, il est visible avant
 * l'hydratation, et un clic à ce moment-là serait perdu.
 */
export async function ouvrirSimulateur(page: Page, url: string) {
  const r = await page.goto(url);
  await page.waitForFunction(() => 'simulateurPret' in document.documentElement.dataset);
  return r;
}
