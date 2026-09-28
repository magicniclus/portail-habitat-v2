import { expect, type Page } from '@playwright/test';

/** Mot de passe des comptes du seed (`SEED_MOT_DE_PASSE`, émulateur seulement). */
export const MOT_DE_PASSE = process.env.SEED_MOT_DE_PASSE ?? 'MotDePasse-e2e-2026';

export const COMPTES = {
  proprio: 'proprio@test.local',
  collab: 'collab@test.local',
  compta: 'compta@test.local',
} as const;

export async function connecter(page: Page, email: string, suite = '/pro/tableau-de-bord') {
  await page.goto(`/connexion?espace=pro&suite=${encodeURIComponent(suite)}`);
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Mot de passe/).fill(MOT_DE_PASSE);
  await page.getByRole('button', { name: 'Me connecter' }).click();
  await expect(page).toHaveURL(new RegExp(suite.replace(/[/?]/g, '\\$&')));
}
