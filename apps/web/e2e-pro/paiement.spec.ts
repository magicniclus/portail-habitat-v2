import {
  champsTropPetits,
  ciblesTropPetites,
  defileHorizontalement,
} from '@ph/config/playwright/mesures';
import { expect, test } from '@playwright/test';
import { connecter, entrepriseDe, proprietaireAvecPlan, webhookStripe } from './outils';

// ACQ-03, PAY-01, PAY-02 (maquettes Paiement Offre Premium / Option Visibilité). Sans clé Stripe
// sur le serveur e2e, la redirection vers Checkout se vérifie en recette ; le webhook, lui, est
// appelé ici avec des événements signés.

test.describe('Paiement', () => {
  test('ACQ-03 : la landing transmet ?facturation= et la page s’ouvre sur la bonne formule', async ({
    page,
  }) => {
    await page.goto('/pro');
    await page
      .getByRole('radiogroup', { name: 'Facturation' })
      .getByRole('radio', { name: /^Mensuel/ })
      .click();
    await expect(page.getByRole('link', { name: 'Passer Premium' })).toHaveAttribute(
      'href',
      '/pro/abonnement/premium?facturation=mensuel',
    );
    const email = await proprietaireAvecPlan('gratuit');
    await connecter(page, email, '/pro/abonnement/premium?facturation=mensuel');
    await expect(page.getByRole('heading', { level: 1, name: 'Abonnement Premium' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /^Mensuel/ })).toBeChecked();
    await expect(page.getByTestId('total-ttc')).toHaveText(/119,88\s€/);
    await page.getByRole('radio', { name: /^Annuel/ }).check();
    await expect(page).toHaveURL(/facturation=annuel/);
    // Annuel : total dû = 12 mois TTC (958,80 € HT + 20 %).
    await expect(page.getByTestId('total-ttc')).toHaveText(/1\s150,56\s€/);
    await page.evaluate(() => document.fonts.ready);
    expect(await defileHorizontalement(page)).toBe(false);
    expect(await ciblesTropPetites(page)).toEqual([]);
    expect(await champsTropPetits(page)).toEqual([]);
  });

  test('sans clé Stripe, le paiement est annoncé indisponible (aucune carte saisie ici)', async ({
    page,
  }) => {
    await connecter(page, await proprietaireAvecPlan('gratuit'), '/pro/abonnement/visibilite');
    await expect(page.getByTestId('total-ttc')).toHaveText(/95,88\s€/);
    await expect(page.locator('input[autocomplete^="cc-"]')).toHaveCount(0);
    await page.getByRole('button', { name: /^Payer/ }).click();
    await expect(
      page.getByText('Les paiements en ligne ne sont pas encore ouverts.'),
    ).toBeVisible();
  });

  test('PAY-01 et PAY-02 : le retour attend le webhook ; un événement rejoué n’a qu’un effet', async ({
    page,
    request,
  }, info) => {
    const email = await proprietaireAvecPlan('gratuit');
    const artisanId = await entrepriseDe(email);
    await connecter(page, email, '/pro/abonnement/confirme?produit=visibilite');
    await expect(page.getByRole('heading', { name: 'Confirmation du paiement…' })).toBeVisible();

    const maintenant = Math.floor(Date.now() / 1000);
    const abonnement = (statut: string) => ({
      id: `sub_e2e_${info.project.name}`,
      customer: 'cus_e2e',
      status: statut,
      metadata: { artisanId },
      cancel_at_period_end: false,
      canceled_at: null,
      items: {
        data: [
          {
            price: { id: 'price_e2e', lookup_key: 'ph_visibilite_annuel' },
            quantity: 1,
            current_period_start: maintenant,
            current_period_end: maintenant + 365 * 86_400,
          },
        ],
      },
    });
    const cree = {
      id: `evt_e2e_cree_${info.project.name}_${maintenant}`,
      type: 'customer.subscription.created',
      data: { object: abonnement('active') },
    };
    expect((await webhookStripe(request, cree)).corps.resultat).toBe('traite');
    await expect(page.getByRole('heading', { name: 'Paiement confirmé' })).toBeVisible({
      timeout: 10_000,
    });
    expect((await webhookStripe(request, cree)).corps.resultat).toBe('deja_traite');

    // Facturation : l'abonnement apparaît, avec le portail client.
    await page.goto('/pro/facturation');
    await expect(page.getByText(/Option Visibilité · annuel/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gérer mon abonnement' })).toBeVisible();

    // Remise en l'état : fin de l'abonnement, par le webhook aussi.
    const fin = await webhookStripe(request, {
      id: `evt_e2e_fin_${info.project.name}_${maintenant}`,
      type: 'customer.subscription.deleted',
      created: maintenant + 1,
      data: { object: abonnement('canceled') },
    });
    expect(fin.corps.resultat).toBe('traite');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Formule gratuite' })).toBeVisible();
  });

  test('signature fausse : refusée', async ({ request }) => {
    const r = await request.post('/api/stripe/webhook', {
      data: '{"id":"evt_x","type":"invoice.paid"}',
      headers: { 'stripe-signature': 't=1,v1=faux' },
    });
    expect(r.status()).toBe(400);
  });
});
