import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import type { Notification } from '../src/serveur/comptes';
import {
  creerCheckoutAbonnement,
  lireFacturation,
  ouvrirPortailClient,
  traiterEvenementStripe,
  type EvenementStripe,
  type ServicesFacturation,
} from '../src/serveur/facturation';

let db: Firestore;
let envois: Notification[];
let s: ServicesFacturation;
const T = Date.UTC(2026, 9, 1);
const sec = (ms: number) => Math.floor(ms / 1000);
const JOUR = 86_400;

beforeAll(() => {
  db = getFirestore(appAdmin());
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  envois = [];
  s = {
    db,
    auth: getAuth(appAdmin()),
    horloge: () => T,
    notifier: async (n) => void envois.push(n),
  };
  await Promise.all([
    db.doc(chemins.artisan('a1')).set({
      nomCommercial: 'Bertrand Rénovation',
      proprietaireUid: 'p1',
      plan: 'gratuit',
      optionVisibilite: false,
      siegesMax: 1,
    }),
    db
      .doc(chemins.membre('a1', 'p1'))
      .set({ role: 'proprietaire', statut: 'actif', ajouteLe: Timestamp.fromMillis(T) }),
  ]);
});

let n = 0;
const evenement = (
  type: string,
  object: unknown,
  extra: Partial<EvenementStripe> = {},
): EvenementStripe => ({
  id: `evt_${++n}`,
  type,
  created: sec(T) + n,
  data: { object },
  ...extra,
});

const abonnement = (p: {
  id?: string;
  statut?: string;
  cle?: string;
  sieges?: number;
  resiliation?: boolean;
  debut?: number;
}) => ({
  id: p.id ?? 'sub_1',
  customer: 'cus_1',
  status: p.statut ?? 'active',
  metadata: { artisanId: 'a1' },
  cancel_at_period_end: p.resiliation ?? false,
  canceled_at: null,
  items: {
    data: [
      {
        price: { id: 'price_x', lookup_key: p.cle ?? 'ph_premium_annuel' },
        quantity: 1,
        current_period_start: p.debut ?? sec(T) - 10 * JOUR,
        current_period_end: sec(T) + 355 * JOUR,
      },
      ...(p.sieges
        ? [{ price: { id: 'price_s', lookup_key: 'ph_siege' }, quantity: p.sieges }]
        : []),
    ],
  },
});

const artisan = async () => (await db.doc(chemins.artisan('a1')).get()).data()!;

describe('webhook Stripe (INTEGRATIONS §1)', () => {
  it('PAY-02 : le même événement reçu deux fois n’a qu’un seul effet', async () => {
    const ev = evenement('customer.subscription.created', abonnement({}));
    expect(await traiterEvenementStripe(s, ev)).toBe('traite');
    expect(await traiterEvenementStripe(s, ev)).toBe('deja_traite');
    expect(envois.map((e) => e.modele)).toEqual(['abonnement-active']);
    const a = await artisan();
    expect(a).toMatchObject({
      plan: 'premium',
      planPeriode: 'annuel',
      optionVisibilite: true,
      siegesMax: 3,
    });
    const abo = await db.collection(collections.abonnements).doc('sub_1').get();
    expect(abo.data()).toMatchObject({
      artisanId: 'a1',
      produit: 'premium',
      periode: 'annuel',
      statut: 'active',
    });
  });

  it('sièges achetés : siegesMax suit la quantité', async () => {
    await traiterEvenementStripe(
      s,
      evenement('customer.subscription.updated', abonnement({ sieges: 2 })),
    );
    expect((await artisan()).siegesMax).toBe(5);
  });

  it('résiliation en fin de période : email, Premium gardé jusqu’au bout, puis fin', async () => {
    await traiterEvenementStripe(s, evenement('customer.subscription.created', abonnement({})));
    await traiterEvenementStripe(
      s,
      evenement('customer.subscription.updated', abonnement({ resiliation: true }), {
        data: {
          object: abonnement({ resiliation: true }),
          previous_attributes: { cancel_at_period_end: false },
        },
      }),
    );
    expect((await artisan()).plan).toBe('premium');
    await traiterEvenementStripe(
      s,
      evenement('customer.subscription.deleted', abonnement({ statut: 'canceled' })),
    );
    const a = await artisan();
    expect(a).toMatchObject({ plan: 'gratuit', optionVisibilite: false, siegesMax: 1 });
    expect(a.planPeriode).toBeUndefined();
    expect(envois.map((e) => e.modele)).toEqual([
      'abonnement-active',
      'abonnement-resilie',
      'abonnement-termine',
    ]);
  });

  it('un événement plus ancien n’écrase pas un état plus récent', async () => {
    const recent = evenement('customer.subscription.deleted', abonnement({ statut: 'canceled' }));
    const ancien = {
      ...evenement('customer.subscription.updated', abonnement({})),
      created: recent.created - 100,
    };
    await traiterEvenementStripe(s, recent);
    expect(await traiterEvenementStripe(s, ancien)).toBe('ignore');
    expect((await artisan()).plan).toBe('gratuit');
  });

  it('Visibilité seule, puis Premium : les deux abonnements comptent', async () => {
    await traiterEvenementStripe(
      s,
      evenement(
        'customer.subscription.created',
        abonnement({ id: 'sub_v', cle: 'ph_visibilite_mensuel' }),
      ),
    );
    expect(await artisan()).toMatchObject({ plan: 'gratuit', optionVisibilite: true });
    await traiterEvenementStripe(
      s,
      evenement('customer.subscription.created', abonnement({ id: 'sub_p' })),
    );
    expect(await artisan()).toMatchObject({ plan: 'premium', optionVisibilite: true });
  });

  it('facture payée : miroir, reçu, crédits inclus du mois ; échec : relance', async () => {
    await traiterEvenementStripe(s, evenement('customer.subscription.created', abonnement({})));
    const facture = {
      id: 'in_1',
      number: 'PH-0001',
      customer: 'cus_1',
      status: 'paid',
      parent: { subscription_details: { subscription: 'sub_1', metadata: { artisanId: 'a1' } } },
      subtotal: 95_880,
      total_excluding_tax: 95_880,
      total: 115_056,
      currency: 'eur',
      hosted_invoice_url: 'https://invoice.stripe.com/i/x',
      period_start: sec(T),
      period_end: sec(T),
      lines: { data: [{ period: { start: sec(T), end: sec(T) + 365 * JOUR } }] },
      status_transitions: { paid_at: sec(T) },
      payment_intent: 'pi_1',
    };
    await traiterEvenementStripe(s, evenement('invoice.paid', facture));
    const f = (await db.collection(collections.factures).doc('in_1').get()).data()!;
    expect(f).toMatchObject({
      montantHtCentimes: 95_880,
      tvaCentimes: 19_176,
      montantTtcCentimes: 115_056,
    });
    expect((await db.doc(chemins.portefeuille('a1')).get()).data()).toMatchObject({
      creditsInclusRestants: 5,
      soldeCredits: 0,
    });
    await traiterEvenementStripe(
      s,
      evenement('invoice.payment_failed', { ...facture, id: 'in_2', status: 'open' }),
    );
    expect(envois.map((e) => e.modele)).toEqual(['abonnement-active', 'recu', 'paiement-echoue']);
  });

  it('pack de crédits : solde crédité une seule fois, mouvement journalisé', async () => {
    const ev = evenement('checkout.session.completed', {
      id: 'cs_1',
      mode: 'payment',
      customer: 'cus_1',
      subscription: null,
      client_reference_id: 'a1',
      metadata: { type: 'pack', credits: '10' },
      payment_status: 'paid',
    });
    await traiterEvenementStripe(s, ev);
    await traiterEvenementStripe(s, ev);
    expect((await db.doc(chemins.portefeuille('a1')).get()).get('soldeCredits')).toBe(10);
    expect((await db.collection(chemins.mouvements('a1')).get()).size).toBe(1);
    expect((await db.doc(chemins.facturationPrivee('a1')).get()).get('stripeCustomerId')).toBe(
      'cus_1',
    );
    expect(envois.map((e) => e.modele)).toEqual(['pack-achete']);
  });

  it('renouvellement annuel : information 7 jours avant', async () => {
    await traiterEvenementStripe(s, evenement('customer.subscription.created', abonnement({})));
    await traiterEvenementStripe(
      s,
      evenement('invoice.upcoming', {
        number: null,
        customer: 'cus_1',
        status: 'draft',
        subscription: 'sub_1',
        subtotal: 95_880,
        total: 115_056,
        currency: 'eur',
        period_start: sec(T),
        period_end: sec(T),
      }),
    );
    expect(envois.map((e) => e.modele)).toEqual(['abonnement-active', 'renouvellement']);
  });

  it('entreprise inconnue : erreur notée, l’événement sera retraité au prochain envoi', async () => {
    const orphelin = { ...abonnement({ id: 'sub_x' }), metadata: {} };
    const ev = evenement('customer.subscription.updated', orphelin);
    await expect(traiterEvenementStripe(s, ev)).rejects.toThrow();
    expect((await db.collection(collections.stripeEvents).doc(ev.id).get()).get('ok')).toBe(false);
  });

  it('événement non géré : ignoré mais noté', async () => {
    expect(await traiterEvenementStripe(s, evenement('customer.created', {}))).toBe('ignore');
  });
});

describe('Checkout et portail client', () => {
  const appels: { type: string; p: Record<string, unknown> }[] = [];
  const faux = (prix = true) => ({
    customers: {
      create: async (p: Record<string, unknown>) => (
        appels.push({ type: 'client', p }),
        { id: 'cus_nouveau' }
      ),
    },
    prices: {
      list: async () => ({
        data: prix ? [{ id: 'price_pa', lookup_key: 'ph_premium_annuel' }] : [],
      }),
    },
    checkout: {
      sessions: {
        create: async (p: Record<string, unknown>) => (
          appels.push({ type: 'session', p }),
          { id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1' }
        ),
      },
    },
    billingPortal: {
      sessions: { create: async () => ({ url: 'https://billing.stripe.com/p/x' }) },
    },
  });
  const services = (prix = true) => ({ db, stripe: faux(prix), urlSite: 'https://ph.test' });

  beforeEach(() => {
    appels.length = 0;
  });

  it('crée le client Stripe une seule fois et une session avec l’entreprise en métadonnées', async () => {
    const e = {
      artisanId: 'a1',
      email: 'p@test.local',
      produit: 'premium' as const,
      periode: 'annuel' as const,
    };
    expect(await creerCheckoutAbonnement(services(), e)).toEqual({
      url: 'https://checkout.stripe.com/c/cs_1',
    });
    await creerCheckoutAbonnement(services(), e);
    expect(appels.filter((a) => a.type === 'client')).toHaveLength(1);
    const session = appels.find((a) => a.type === 'session')!.p;
    expect(session).toMatchObject({
      mode: 'subscription',
      customer: 'cus_nouveau',
      client_reference_id: 'a1',
      line_items: [{ price: 'price_pa', quantity: 1 }],
      subscription_data: { metadata: { artisanId: 'a1', produit: 'premium' } },
      allow_promotion_codes: true,
      cancel_url: 'https://ph.test/pro/abonnement/premium?facturation=annuel',
    });
  });

  it('refuse un second Premium et une offre sans prix Stripe', async () => {
    await expect(
      creerCheckoutAbonnement(services(false), {
        artisanId: 'a1',
        email: 'p@test.local',
        produit: 'premium',
        periode: 'mensuel',
      }),
    ).rejects.toMatchObject({ code: 'INDISPONIBLE' });
    await db.doc(chemins.artisan('a1')).update({ plan: 'premium', optionVisibilite: true });
    await expect(
      creerCheckoutAbonnement(services(), {
        artisanId: 'a1',
        email: 'p@test.local',
        produit: 'visibilite',
        periode: 'annuel',
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION' });
  });

  it('portail : seulement après un premier paiement', async () => {
    await expect(ouvrirPortailClient(services(), 'a1')).rejects.toMatchObject({
      code: 'PRECONDITION',
    });
    await db.doc(chemins.facturationPrivee('a1')).set({ stripeCustomerId: 'cus_1' });
    expect(await ouvrirPortailClient(services(), 'a1')).toEqual({
      url: 'https://billing.stripe.com/p/x',
    });
  });
});

describe('lireFacturation', () => {
  it('abonnements en cours et factures récentes, objets simples', async () => {
    await traiterEvenementStripe(s, evenement('customer.subscription.created', abonnement({})));
    await traiterEvenementStripe(
      s,
      evenement('customer.subscription.created', abonnement({ id: 'sub_old', statut: 'canceled' })),
    );
    await db
      .collection(collections.factures)
      .doc('in_1')
      .set({
        artisanId: 'a1',
        numero: 'PH-0001',
        montantTtcCentimes: 115_056,
        statut: 'paid',
        hostedUrl: 'https://invoice.stripe.com/i/x',
        createdAt: Timestamp.fromMillis(T),
      });
    const f = await lireFacturation(db, 'a1');
    expect(f.abonnements.map((a) => [a.id, a.produit, a.periode])).toEqual([
      ['sub_1', 'premium', 'annuel'],
    ]);
    expect(f.factures).toEqual([
      {
        id: 'in_1',
        numero: 'PH-0001',
        montantTtcCentimes: 115_056,
        statut: 'paid',
        date: T,
        lien: 'https://invoice.stripe.com/i/x',
      },
    ]);
  });
});
