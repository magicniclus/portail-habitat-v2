import { expect, test } from '@playwright/test';
import { abonnementActif, connecter, proprietaireAvecPlan } from './outils';

// docs/CONVERSION.md §3 S8 (lot 13b) : la route serveur (Stripe) est simulée ici, elle est
// couverte sur émulateur avec un faux Stripe.

test('S8 : raison obligatoire, alternative proposée, puis résiliation confirmée en fin de période', async ({
  page,
}) => {
  const email = await proprietaireAvecPlan('gratuit');
  await abonnementActif(email, 'visibilite');
  const id = expect.stringMatching(/^sub_e2e\d+$/);
  const recus: unknown[] = [];
  await page.route('**/api/pro/abonnement/resiliation', async (r) => {
    const corps = r.request().postDataJSON() as { etape: string };
    recus.push(corps);
    return r.fulfill({
      status: 200,
      json:
        corps.etape === 'proposer'
          ? { ok: true, data: { alternative: { type: 'suspendre', mois: 2 } } }
          : { ok: true, data: { finPeriode: Date.UTC(2026, 10, 24, 12) } },
    });
  });
  await connecter(page, email, '/pro/facturation');
  await page.getByRole('link', { name: 'Résilier mon abonnement' }).click();
  await expect(page.getByRole('heading', { name: 'Résilier mon abonnement' })).toBeVisible();
  const continuer = page.getByRole('button', { name: 'Continuer' });
  await expect(continuer).toBeDisabled();
  await page.getByText('Saison creuse, ou j’ai trop de travail en ce moment').click();
  await continuer.click();
  const proposition = page.getByRole('region', { name: 'Notre proposition' });
  await expect(proposition).toContainText('Suspendez 2 mois, sans rien payer');
  await proposition.getByRole('button', { name: 'Non merci, résilier en fin de période' }).click();
  await expect(page.getByText('Résiliation enregistrée')).toBeVisible();
  await expect(page.getByText(/jusqu’au 24 novembre 2026/)).toBeVisible();
  expect(recus).toEqual([
    { etape: 'proposer', abonnementId: id, raison: 'saison_creuse' },
    { etape: 'confirmer', abonnementId: id, raison: 'saison_creuse' },
  ]);
});
