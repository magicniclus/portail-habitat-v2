import { expect, test } from '@playwright/test';

// docs/ACCEPTANCE.md, Accueil particuliers.
test.describe('Accueil particuliers', () => {
  test('ACC-02 : un chip « Projets populaires » remplit le champ projet', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Salle de bain' }).click();
    await expect(page.getByLabel('Quel est votre projet ?')).toHaveValue('Salle de bain');
    await expect(page.getByRole('button', { name: 'Salle de bain' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('ACC-03 : le formulaire du hero mène au simulateur, prestation et code postal préremplis', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Peinture' }).click();
    await page.getByLabel('Code postal').fill('33000');
    await page.getByRole('button', { name: 'Lancer mon estimation gratuite' }).click();
    await expect(page).toHaveURL(/\/simulateur\?prestation=peinture&cp=33000/);
  });

  test('ACC-04 : sur mobile, la navigation passe dans un menu accessible', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'mobile uniquement');
    await page.goto('/');
    // Menu ouvert, Radix masque le reste de la page aux technologies d'assistance : sélecteur CSS.
    const menu = page.locator('button[aria-label="Menu principal"]');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeHidden();
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    const dialogue = page.getByRole('dialog', { name: 'Menu principal' });
    await expect(dialogue.getByRole('link', { name: 'Artisans' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialogue).toBeHidden();
    await expect(menu).toBeFocused();
  });

  test('sur ordinateur, la navigation est visible sans menu', async ({ page, isMobile }) => {
    test.skip(isMobile, 'ordinateur uniquement');
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Menu principal' })).toBeHidden();
  });

  test('pas de défilement horizontal ; JSON-LD FAQPage présent', async ({ page }) => {
    await page.goto('/');
    const largeur = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(largeur).toBeLessThanOrEqual(0);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.some((t) => t.includes('"FAQPage"'))).toBe(true);
  });
});
