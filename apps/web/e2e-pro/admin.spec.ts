import { expect, test, type Page } from '@playwright/test';
import { connecter } from './outils';

// docs/ACCEPTANCE.md ADM-01 (socle du back-office, lot 13a), sur émulateurs.
const ADMIN = {
  super: 'admin@test.local',
  moderateur: 'moderateur@test.local',
  finance: 'finance@test.local',
} as const;

const menu = (page: Page) => page.getByRole('navigation', { name: 'Sections de l’administration' });

test.describe('Back-office : accès par rôle', () => {
  test.skip(({ isMobile }) => isMobile, 'Menu latéral : vérifié sur ordinateur');

  test('sans session : retour à la connexion admin avec la page demandée', async ({ page }) => {
    await page.goto('/admin/finances');
    await expect(page).toHaveURL(/\/connexion\?espace=admin&suite=%2Fadmin%2Ffinances/);
    await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible();
  });

  test('ADM-01 : le modérateur ne voit que ses sections ; les autres renvoient une 403', async ({
    page,
  }) => {
    await connecter(page, ADMIN.moderateur, '/admin', 'admin');
    const nav = menu(page);
    for (const s of [
      'Tableau de bord',
      'File de travail',
      'Artisans',
      'Demandes',
      'Avis',
      'Litiges',
    ])
      await expect(nav.getByRole('link', { name: s })).toBeVisible();
    for (const s of ['Finances', 'Équipe et audit', 'RGPD', 'Algorithme'])
      await expect(nav.getByRole('link', { name: s })).toHaveCount(0);
    const r = await page.goto('/admin/finances');
    expect(r?.status()).toBe(403);
    await expect(page.getByRole('heading', { name: 'Accès refusé' })).toBeVisible();
    expect((await page.goto('/admin/avis'))?.status()).toBe(200);
  });

  test('finance : finances visibles, avis interdits ; superadmin : tout', async ({ page }) => {
    await connecter(page, ADMIN.finance, '/admin', 'admin');
    await expect(menu(page).getByRole('link', { name: 'Finances' })).toBeVisible();
    expect((await page.goto('/admin/avis'))?.status()).toBe(403);
    await page.context().clearCookies();
    await connecter(page, ADMIN.super, '/admin/equipe', 'admin');
    await expect(menu(page).getByRole('link', { name: 'Équipe et audit' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Équipe et audit' })).toBeVisible();
  });

  test('un compte artisan n’entre pas dans l’admin', async ({ page }) => {
    await connecter(page, 'proprio@test.local', '/pro/tableau-de-bord');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/connexion\?espace=admin/);
  });
});
