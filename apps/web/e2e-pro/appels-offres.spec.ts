import { expect, test, type Page } from '@playwright/test';
import {
  appelOffresInvite,
  COMPTES,
  completerAppelOffres,
  connecter,
  entrepriseDe,
  flagGlobal,
  soldeCredits,
} from './outils';

test.describe.configure({ mode: 'serial' });

let remettre: () => Promise<void>;
test.beforeAll(async () => {
  remettre = await flagGlobal('appelsOffresPayants', true);
});
test.afterAll(async () => {
  await remettre();
});

const carte = (page: Page, titre: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: titre }) });

test('PRO-05 : crédits insuffisants → carte ou pack ; avec des crédits → débloqué', async ({
  page,
}) => {
  const artisanId = await entrepriseDe(COMPTES.proprio);
  await soldeCredits(artisanId, 0);
  const { titre } = await appelOffresInvite(artisanId);
  await connecter(page, COMPTES.proprio, '/pro/appels-d-offres');
  await carte(page, titre)
    .getByRole('button', { name: /Répondre à cet appel d’offres/ })
    .click();
  const feuille = page.getByRole('dialog', { name: 'Répondre à cet appel d’offres' });
  await expect(feuille.getByText('Crédits insuffisants')).toBeVisible();
  await expect(feuille.getByRole('button', { name: /par carte/ })).toBeVisible();
  await expect(
    feuille.getByRole('list', { name: 'Packs de crédits' }).getByRole('button'),
  ).toHaveCount(3);
  await page.keyboard.press('Escape');

  await soldeCredits(artisanId, 5);
  await page.reload();
  await carte(page, titre)
    .getByRole('button', { name: /Répondre à cet appel d’offres/ })
    .click();
  await feuille.getByRole('button', { name: 'Utiliser 2 crédits' }).click();
  await expect(feuille.getByText('Coordonnées débloquées')).toBeVisible();
  expect(await soldeCredits(artisanId)).toBe(3);
  await page.keyboard.press('Escape');
  await expect(
    carte(page, titre).getByRole('link', { name: 'Voir les coordonnées dans Mes demandes' }),
  ).toBeVisible();
});

test('PRO-06 : la dernière place est prise entre-temps → « Complet », rien n’est débité', async ({
  page,
}) => {
  const artisanId = await entrepriseDe(COMPTES.proprio);
  await soldeCredits(artisanId, 5);
  const { id, titre } = await appelOffresInvite(artisanId, { nbDeblocages: 2 });
  await connecter(page, COMPTES.proprio, '/pro/appels-d-offres');
  await expect(carte(page, titre).getByText('Plus qu’une place')).toBeVisible();
  await carte(page, titre)
    .getByRole('button', { name: /Répondre à cet appel d’offres/ })
    .click();
  await completerAppelOffres(id);
  const feuille = page.getByRole('dialog', { name: 'Répondre à cet appel d’offres' });
  await feuille.getByRole('button', { name: 'Utiliser 2 crédits' }).click();
  await expect(feuille.getByText(/Complet/)).toBeVisible();
  expect(await soldeCredits(artisanId)).toBe(5);
});

test('PRO-04 : un collaborateur sans droit de dépense ne voit pas le bouton', async ({ page }) => {
  const artisanId = await entrepriseDe(COMPTES.collab);
  const { titre } = await appelOffresInvite(artisanId);
  await connecter(page, COMPTES.collab, '/pro/appels-d-offres');
  await expect(carte(page, titre)).toBeVisible();
  await expect(carte(page, titre).getByRole('button', { name: /Répondre/ })).toHaveCount(0);
  await expect(carte(page, titre).getByText(/Demandez à un responsable/)).toBeVisible();
});
