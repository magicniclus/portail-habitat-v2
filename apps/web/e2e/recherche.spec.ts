import { expect, test, type Page } from '@playwright/test';

// docs/RECHERCHE.md §7 (RCH-01 à RCH-08).
const champ = (page: Page) => page.getByRole('combobox', { name: 'Quel est votre projet ?' });
const liste = (page: Page) => page.getByRole('listbox', { name: 'Suggestions de projets' });

async function taper(page: Page, texte: string) {
  await page.goto('/');
  await champ(page).click();
  await champ(page).pressSequentially(texte, { delay: 20 });
}

test.describe('Recherche de projet', () => {
  test('RCH-01 : « sdb ita » propose « Douche à l’italienne » en 1er, « italienne » reconnu en gras', async ({
    page,
  }) => {
    await taper(page, 'sdb ita');
    const premiere = liste(page).getByRole('option').first();
    await expect(premiere).toContainText("Douche à l'italienne");
    await expect(premiere.locator('strong').first()).toHaveText(/ital/i);
    await expect(premiere).toContainText('Estimation en ligne');
  });

  test('RCH-02 : faute corrigée, « Résultats pour douche italienne »', async ({ page }) => {
    await taper(page, 'douche italiene');
    await expect(liste(page)).toContainText('Résultats pour douche italienne');
  });

  test('RCH-03 : ↓ puis Entrée choisit ; Échap ferme ; le focus reste dans le champ', async ({
    page,
  }) => {
    await taper(page, 'pac');
    await expect(liste(page)).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(champ(page)).toHaveAttribute('aria-activedescendant', /-0$/);
    await page.keyboard.press('Enter');
    await expect(liste(page)).toBeHidden();
    await expect(champ(page)).toHaveValue(/pompe à chaleur/i);
    await expect(champ(page)).toBeFocused();
    await champ(page).pressSequentially(' x');
    await expect(liste(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(liste(page)).toBeHidden();
    await expect(champ(page)).toBeFocused();
  });

  test('RCH-04 : suggestion choisie + validation → simulateur de la bonne prestation, code postal prérempli', async ({
    page,
  }) => {
    await taper(page, 'douche ital');
    await liste(page).getByRole('option').first().click();
    await page.getByLabel('Code postal').fill('33000');
    await page.getByRole('button', { name: 'Lancer mon estimation gratuite' }).click();
    await expect(page).toHaveURL(
      /\/simulateur\?prestation=sdb-douche&intention=sdb-italienne&cp=33000/,
    );
  });

  test('RCH-05 : sans résultat, message d’orientation, validation possible, recherche_zero envoyé', async ({
    page,
    isMobile,
  }) => {
    const evenements: string[] = [];
    await page.route('**/api/recherche/evenement', async (route) => {
      evenements.push(route.request().postData() ?? '');
      await route.fulfill({ status: 204 });
    });
    await taper(page, 'xyzabc');
    await expect(liste(page)).toContainText("Nous n'avons pas trouvé « xyzabc »");
    await expect.poll(() => evenements.some((e) => e.includes('"nature":"zero"'))).toBe(true);
    expect(evenements.join()).not.toMatch(/@|\d{5}/);
    // Mobile : la recherche est en plein écran, on valide avec la touche Entrée (« Rechercher ») du clavier.
    if (isMobile) await champ(page).press('Enter');
    else await page.getByRole('button', { name: 'Lancer mon estimation gratuite' }).click();
    await expect(page).toHaveURL(/\/simulateur\?projet=xyzabc/);
  });

  test('RCH-06 : après un résultat, les chips deviennent « Projets associés » du même métier', async ({
    page,
  }) => {
    await taper(page, 'douche italienne');
    await expect(page.getByText('Projets associés :')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rénovation de salle de bain' })).toBeVisible();
  });

  test('RCH-07 : « toit qui fuit urgent » affiche le message d’urgence', async ({ page }) => {
    await taper(page, 'toit qui fuit urgent');
    await expect(liste(page)).toContainText('Urgence ?');
    await expect(page.getByLabel('Démarrage souhaité')).toHaveValue('asap');
  });

  test('RCH-08 : nombre de suggestions et option active annoncés', async ({ page }) => {
    await taper(page, 'pac');
    await expect(
      page.locator('[aria-live="polite"]').filter({ hasText: /\d+ suggestions?/ }),
    ).toHaveCount(1);
    await expect(champ(page)).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(champ(page)).toHaveAttribute('aria-activedescendant', /.+/);
    const actif = await champ(page).getAttribute('aria-activedescendant');
    await expect(page.locator(`[id="${actif}"]`)).toHaveAttribute('aria-selected', 'true');
  });
});
