import { expect, test, type Page } from '@playwright/test';
import { COMPTES, connecter, entrepriseDe, liensEnvoyes, siegesLibres } from './outils';

// docs/ACCEPTANCE.md INV-01 à INV-03 (maquette Invitation), sur émulateurs.

/** Le propriétaire invite `email` ; renvoie le chemin du lien reçu (`/pro/invitation?t=…`). */
async function inviter(page: Page, email: string): Promise<string> {
  const avant = new Set(await liensEnvoyes('/pro/invitation?t='));
  await connecter(page, COMPTES.proprio, '/pro/equipe');
  await page.getByRole('button', { name: 'Inviter' }).click();
  const f = page.getByRole('dialog', { name: 'Inviter un membre' });
  await f.getByLabel(/^Email/).fill(email);
  await f.getByRole('button', { name: "Envoyer l'invitation" }).click();
  await expect(page.getByRole('list', { name: 'Invitations en attente' })).toContainText(email);
  await expect
    .poll(async () => (await liensEnvoyes('/pro/invitation?t=')).filter((l) => !avant.has(l)))
    .not.toHaveLength(0);
  const lien = (await liensEnvoyes('/pro/invitation?t=')).find((l) => !avant.has(l))!;
  return lien.slice(lien.indexOf('/pro/invitation'));
}

test.describe('Invitation', () => {
  test('INV-01 : entreprise, rôle et invitant affichés ; accès créé, équipe rejointe', async ({
    page,
    browser,
  }, info) => {
    const remettre = await siegesLibres(await entrepriseDe(COMPTES.proprio), 1);
    try {
      const lien = await inviter(page, `invite-${info.project.name}-${Date.now()}@test.local`);
      const invite = await browser.newContext({ ...info.project.use });
      const p = await invite.newPage();
      await p.goto(lien);
      await expect(p.getByRole('heading', { level: 1, name: /^Rejoindre / })).toBeVisible();
      await expect(p.getByText(/vous invite à rejoindre/)).toContainText('Paul Proprio');
      await expect(p.getByText(/^Rôle :/)).toContainText('Collaborateur');
      await p.getByLabel(/^Votre nom et prénom/).fill('Inès Invitée');
      await p.getByLabel(/^Choisissez un mot de passe/).fill('MotDePasse-invite-1');
      await p.getByRole('button', { name: "Créer mon accès et rejoindre l'équipe" }).click();
      await expect(p).toHaveURL(/\/pro\/tableau-de-bord/, { timeout: 15_000 });
      await expect(p.getByRole('heading', { level: 1, name: /^Bonjour / })).toBeVisible();
      await invite.close();
    } finally {
      await remettre();
    }
  });

  test('INV-02 : connecté avec une autre adresse → refus avec l’email masqué', async ({
    page,
    browser,
  }, info) => {
    const remettre = await siegesLibres(await entrepriseDe(COMPTES.proprio), 1);
    try {
      const lien = await inviter(page, `autre-${info.project.name}-${Date.now()}@test.local`);
      const collab = await browser.newContext({ ...info.project.use });
      const p = await collab.newPage();
      await connecter(p, COMPTES.collab, '/pro/tableau-de-bord');
      await p.goto(lien);
      await expect(p.getByText('Cette invitation est destinée à une autre adresse')).toBeVisible();
      await expect(p.getByText(/a•••@t•••\.local/)).toBeVisible();
      await expect(p.getByRole('button', { name: "Rejoindre l'équipe" })).toHaveCount(0);
      await collab.close();
      // INV-03 : invitation annulée → lien plus valable, nouvelle invitation proposée.
      const attente = page.getByRole('list', { name: 'Invitations en attente' });
      await attente.getByRole('button', { name: 'Annuler' }).first().click();
      await expect(attente).toHaveCount(0);
      await page.goto(lien);
      await expect(
        page.getByRole('link', { name: 'Demander une nouvelle invitation' }),
      ).toBeVisible();
    } finally {
      await remettre();
    }
  });

  test('INV-03 : lien inconnu → invitation plus valable', async ({ page }) => {
    await page.goto(`/pro/invitation?t=${'x'.repeat(43)}`);
    await expect(
      page.getByRole('heading', { name: "Ce lien d'invitation n'est plus valable" }),
    ).toBeVisible();
  });
});
