import {
  champsTropPetits,
  ciblesTropPetites,
  defileHorizontalement,
} from '@ph/config/playwright/mesures';
import { expect, test } from '@playwright/test';
import {
  connecter,
  entrepriseDe,
  flagGlobal,
  proprietaireAvecPlan,
  soldeCredits,
  webhookStripe,
} from './outils';

// PAY-02, PAY-05, PAY-10 (maquettes Mon Abonnement et Fenetre Offre). Sans clé Stripe sur le
// serveur e2e, la redirection vers Checkout se vérifie en recette ; le webhook, lui, est appelé
// ici avec des événements signés.

test.describe('Paiement', () => {
  test('PAY-02 : ?offre=tout ouvre la fenêtre de paiement de Tout inclus, CGV obligatoires', async ({
    page,
  }) => {
    const email = await proprietaireAvecPlan('gratuit');
    await connecter(page, email, '/pro/abonnement?offre=tout');
    const fenetre = page.getByRole('dialog', { name: 'Passer à Tout inclus' });
    await expect(fenetre.getByTestId('total-ttc')).toHaveText(/58,80\s€/);
    const payer = fenetre.getByRole('button', { name: 'Continuer vers le paiement' });
    await expect(fenetre.getByRole('checkbox')).toHaveCount(0);
    await expect(payer).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    expect(await defileHorizontalement(page)).toBe(false);
    expect(await ciblesTropPetites(page)).toEqual([]);
    expect(await champsTropPetits(page)).toEqual([]);
    // Aucune carte saisie ici (règle 7) ; sans clé Stripe, paiement annoncé indisponible.
    await expect(page.locator('input[autocomplete^="cc-"]')).toHaveCount(0);
    await payer.click();
    await expect(
      fenetre.getByText('Les paiements en ligne ne sont pas encore ouverts.'),
    ).toBeVisible();
  });

  test('« Aller plus loin » : formules qui ajoutent quelque chose, Site Pro d’abord ; crédits selon le flag', async ({
    page,
  }) => {
    const email = await proprietaireAvecPlan('gratuit');
    const artisanId = await entrepriseDe(email);
    const solde = await soldeCredits(artisanId);
    const remettre = await flagGlobal('appelsOffresPayants', false);
    try {
      await soldeCredits(artisanId, 0);
      await connecter(page, email, '/pro/abonnement');
      const bloc = page.getByRole('region', { name: 'Aller plus loin' });
      await expect(bloc.getByRole('listitem').locator('strong')).toHaveText([
        'Site Pro',
        'Fiche Pro',
        'Fiche + Site',
        'Tout inclus',
      ]);
      await expect(bloc).toContainText('9,90 € HT / mois');
      // Déblocage des appels d'offres fermé, solde nul : pas de section crédits.
      await expect
        .poll(async () => {
          await page.reload();
          return page.getByRole('heading', { name: "Crédits appels d'offres" }).count();
        })
        .toBe(0);
      // Fermé avec un solde : le solde seul, sans achat.
      await soldeCredits(artisanId, 12);
      await page.reload();
      await expect(page.getByText('Solde : 12 crédits')).toBeVisible();
      await expect(page.getByRole('button', { name: /Acheter/ })).toHaveCount(0);
      await bloc.getByRole('link', { name: 'Choisir Site Pro' }).click();
      await expect(page.getByRole('dialog', { name: 'Passer à Site Pro' })).toBeVisible();
    } finally {
      await remettre();
      await soldeCredits(artisanId, solde);
    }
  });

  test('ancienne page de paiement : redirigée vers la formule qui la remplace (D60)', async ({
    page,
  }) => {
    await connecter(page, await proprietaireAvecPlan('gratuit'), '/pro/abonnement');
    await page.goto('/pro/abonnement/visibilite?facturation=annuel');
    await expect(page).toHaveURL(/\/pro\/abonnement\?offre=fiche$/);
    await expect(page.getByRole('dialog', { name: 'Passer à Fiche Pro' })).toBeVisible();
  });

  test('PAY-01 et PAY-02 : le retour attend le webhook ; un événement rejoué n’a qu’un effet', async ({
    page,
    request,
  }, info) => {
    const email = await proprietaireAvecPlan('gratuit');
    const artisanId = await entrepriseDe(email);
    await connecter(page, email, '/pro/abonnement/confirme?produit=fiche_pro');
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
            price: { id: 'price_e2e', lookup_key: 'ph_fiche_pro' },
            quantity: 1,
            current_period_start: maintenant,
            current_period_end: maintenant + 30 * 86_400,
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

    // Mon abonnement : la formule apparaît, avec le portail client.
    await page.goto('/pro/abonnement');
    await expect(page.getByRole('region', { name: 'Votre formule' })).toContainText('Fiche Pro');
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
    await expect(page.getByRole('region', { name: 'Votre formule' })).toContainText('Gratuit');
  });

  test('signature fausse : refusée', async ({ request }) => {
    const r = await request.post('/api/stripe/webhook', {
      data: '{"id":"evt_x","type":"invoice.paid"}',
      headers: { 'stripe-signature': 't=1,v1=faux' },
    });
    expect(r.status()).toBe(400);
  });
});
