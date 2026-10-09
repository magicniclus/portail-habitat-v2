import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { COMPTES, connecter } from './outils';

// ACCEPTANCE ALL-02 et ALL-03 dans les espaces connectés (pro et admin), sur émulateurs.
test.skip(({ isMobile }) => isMobile, 'Vérifié sur ordinateur (le mobile public est couvert)');

async function verifier(page: Page, chemin: string) {
  const erreurs: string[] = [];
  page.on('console', (m) => {
    // Connexion temps réel de Firestore coupée par la navigation suivante du test (absente si
    // l'on reste sur la page) : pas un défaut de la page.
    if (m.type() === 'error' && !m.text().includes('Could not reach Cloud Firestore backend'))
      erreurs.push(`${chemin} : ${m.text()}`);
  });
  page.on('pageerror', (e) => erreurs.push(`${chemin} : ${e.message}`));
  await page.goto(chemin);
  await page.waitForLoadState('load');
  const axe = await new AxeBuilder({ page }).exclude('iframe').analyze();
  const graves = axe.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${chemin} : ${v.id} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
  return [...graves, ...erreurs];
}

test('espace pro : aucune erreur axe sérieuse, console propre', async ({ page }) => {
  await connecter(page, COMPTES.proprio);
  const problemes: string[] = [];
  for (const c of [
    '/pro/tableau-de-bord',
    '/pro/demandes',
    '/pro/fiche',
    '/pro/statistiques',
    '/pro/avis',
    '/pro/equipe',
    '/pro/compte',
    '/pro/facturation',
  ])
    problemes.push(...(await verifier(page, c)));
  expect(problemes).toEqual([]);
});

test('admin : aucune erreur axe sérieuse, console propre', async ({ page }) => {
  await connecter(page, 'admin@test.local', '/admin', 'admin');
  const problemes: string[] = [];
  for (const c of [
    '/admin',
    '/admin/file',
    '/admin/artisans',
    '/admin/demandes',
    '/admin/conversion',
    '/admin/ia',
    '/admin/referentiels',
    '/admin/equipe',
  ])
    problemes.push(...(await verifier(page, c)));
  expect(problemes).toEqual([]);
});
