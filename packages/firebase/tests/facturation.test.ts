import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import type { Notification } from '../src/serveur/comptes';
import { droitsInitiaux } from '@ph/core/paiements';
import {
  changerFormule,
  changerOptionBlog,
  creerCheckoutPaiement,
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
      droits: droitsInitiaux('gratuit', new Date(T)),
      siegesMax: 1,
    }),
    db
      .doc(chemins.membre('a1', 'p1'))
      .set({ role: 'proprietaire', statut: 'actif', ajouteLe: Timestamp.fromMillis(T) }),
  ]);
});

async function appelOffresOuvert(id: string) {
  await db.doc(chemins.appelOffres(id)).set({
    demandeId: `dem-${id}`,
    statut: 'ouvert',
    acces: 'premium_prioritaire',
    fenetrePremiumMin: 60,
    ouvertLe: Timestamp.fromMillis(T - 2 * 3_600_000),
    nbDeblocages: 0,
    nbDeblocagesMax: 3,
    exigences: [],
    tarification: {
      mode: 'auto',
      prixBaseCentimes: 1900,
      prixPremiumCentimes: 1300,
      prixCredits: 2,
    },
  });
}

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
  option?: boolean;
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
        id: 'si_1',
        price: { id: 'price_x', lookup_key: p.cle ?? 'ph_tout_inclus' },
        quantity: 1,
        current_period_start: p.debut ?? sec(T) - 10 * JOUR,
        current_period_end: sec(T) + 20 * JOUR,
      },
      ...(p.sieges
        ? [{ price: { id: 'price_s', lookup_key: 'ph_siege' }, quantity: p.sieges }]
        : []),
      ...(p.option
        ? [{ id: 'si_blog', price: { id: 'price_b', lookup_key: 'ph_option_blog' }, quantity: 1 }]
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
      droits: {
        formule: 'tout_inclus',
        statut: 'actif',
        iaMultiplicateur: 2,
        remiseAppelsOffres: 0.15,
        avanceAppelsOffresH: 12,
      },
      siegesMax: 3,
    });
    expect(a.droits.finPeriode.toMillis()).toBe(T + 20 * JOUR * 1000);
    expect(a.plan).toBeUndefined();
    const abo = await db.collection(collections.abonnements).doc('sub_1').get();
    expect(abo.data()).toMatchObject({
      artisanId: 'a1',
      produit: 'tout_inclus',
      periode: 'mensuel',
      statut: 'active',
    });
  });

  it('option Blog (D71) : droits.optionBlog en Site Pro, jamais en Tout inclus', async () => {
    await traiterEvenementStripe(
      s,
      evenement('customer.subscription.updated', abonnement({ cle: 'ph_site_pro', option: true })),
    );
    expect((await artisan()).droits).toMatchObject({ formule: 'site_pro', optionBlog: true });
    expect((await db.doc(`${collections.abonnements}/sub_1`).get()).get('optionBlog')).toBe(true);
    await traiterEvenementStripe(
      s,
      evenement('customer.subscription.updated', abonnement({ option: true })),
    );
    expect((await artisan()).droits).toMatchObject({ formule: 'tout_inclus', optionBlog: false });
  });

  it('sièges achetés : siegesMax suit la quantité', async () => {
    await traiterEvenementStripe(
      s,
      evenement('customer.subscription.updated', abonnement({ sieges: 2 })),
    );
    expect((await artisan()).siegesMax).toBe(5);
  });

  it('résiliation en fin de période : email, Tout inclus gardé jusqu’au bout, puis Gratuit', async () => {
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
    expect((await artisan()).droits).toMatchObject({
      formule: 'tout_inclus',
      statut: 'resilie_fin_periode',
    });
    await traiterEvenementStripe(
      s,
      evenement('customer.subscription.deleted', abonnement({ statut: 'canceled' })),
    );
    const a = await artisan();
    expect(a).toMatchObject({ droits: { formule: 'gratuit', sitePro: false }, siegesMax: 1 });
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
    expect((await artisan()).droits.formule).toBe('gratuit');
  });

  it('Fiche Pro, puis Tout inclus pendant le changement : la formule la plus complète l’emporte', async () => {
    await traiterEvenementStripe(
      s,
      evenement('customer.subscription.created', abonnement({ id: 'sub_v', cle: 'ph_fiche_pro' })),
    );
    expect((await artisan()).droits).toMatchObject({
      formule: 'fiche_pro',
      coordonneesVisibles: true,
      sitePro: false,
    });
    await traiterEvenementStripe(
      s,
      evenement('customer.subscription.created', abonnement({ id: 'sub_p' })),
    );
    expect((await artisan()).droits.formule).toBe('tout_inclus');
  });

  it('PAY-08 : paiement refusé, 7 jours de grâce, puis Gratuit', async () => {
    await traiterEvenementStripe(
      s,
      evenement(
        'customer.subscription.updated',
        abonnement({ statut: 'past_due', debut: sec(T) - 2 * JOUR }),
      ),
    );
    expect((await artisan()).droits).toMatchObject({ formule: 'tout_inclus', statut: 'grace' });
    s = { ...s, horloge: () => T + 6 * JOUR * 1000 };
    await traiterEvenementStripe(
      s,
      evenement(
        'customer.subscription.updated',
        abonnement({ statut: 'past_due', debut: sec(T) - 2 * JOUR }),
      ),
    );
    expect((await artisan()).droits.formule).toBe('gratuit');
  });

  it('facture payée : miroir et reçu ; échec : relance', async () => {
    await traiterEvenementStripe(s, evenement('customer.subscription.created', abonnement({})));
    const facture = {
      id: 'in_1',
      number: 'PT-0001',
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

  it('déblocage payé par carte : finalisé une fois, montant encaissé conservé', async () => {
    await appelOffresOuvert('ao2');
    const session = {
      id: 'cs_lead',
      mode: 'payment',
      customer: 'cus_1',
      subscription: null,
      client_reference_id: 'a1',
      payment_status: 'paid',
      payment_intent: 'pi_1',
      metadata: { type: 'lead', appelOffresId: 'ao2', uid: 'p1', centimes: '1700' },
    };
    const ev = evenement('checkout.session.completed', session);
    expect(await traiterEvenementStripe(s, ev)).toBe('traite');
    expect(await traiterEvenementStripe(s, ev)).toBe('deja_traite');
    expect((await db.doc(chemins.deblocage('ao2', 'a1')).get()).data()).toMatchObject({
      moyen: 'carte',
      montantCentimes: 1700,
    });
    const achats = await db.collection(collections.achatsLeads).get();
    expect(achats.docs.map((d) => d.get('stripePaymentIntentId'))).toEqual(['pi_1']);
    expect((await db.doc(chemins.attribution('dem-ao2', 'a1')).get()).get('statut')).toBe(
      'acceptee',
    );
  });

  it('déblocage payé mais complet entre-temps : tâche de remboursement', async () => {
    await appelOffresOuvert('ao3');
    await db.doc(chemins.appelOffres('ao3')).update({ statut: 'complet', nbDeblocages: 3 });
    await traiterEvenementStripe(
      s,
      evenement('checkout.session.completed', {
        id: 'cs_trop_tard',
        mode: 'payment',
        customer: 'cus_1',
        subscription: null,
        client_reference_id: 'a1',
        payment_status: 'paid',
        payment_intent: 'pi_2',
        metadata: { type: 'lead', appelOffresId: 'ao3', uid: 'p1', centimes: '1900' },
      }),
    );
    const tache = await db
      .collection(collections.filesModeration)
      .doc('remboursement-cs_trop_tard')
      .get();
    expect(tache.data()).toMatchObject({
      type: 'remboursement_carte_lead',
      refs: { paymentIntentId: 'pi_2', appelOffresId: 'ao3' },
      permissionRequise: 'finances.rembourser_carte',
    });
    expect((await db.collection(collections.achatsLeads).get()).size).toBe(0);
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
        data: prix ? [{ id: 'price_pa', lookup_key: 'ph_tout_inclus' }] : [],
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
    refunds: { create: async () => ({ id: 're_test' }) },
    subscriptions: {
      retrieve: async (id: string) => ({
        ...abonnement({ id, ...enCours }),
        schedule: null,
      }),
      update: async (id: string, p: Record<string, unknown>) => (
        appels.push({ type: 'maj', p }),
        { id }
      ),
    },
    subscriptionSchedules: {
      create: async () => ({ id: 'sub_sched_1', phases: [{ start_date: 1, end_date: 2 }] }),
      update: async (id: string, p: Record<string, unknown>) => (
        appels.push({ type: 'planning', p }),
        { id }
      ),
    },
    coupons: { create: async () => ({ id: 'coupon' }) },
    promotionCodes: { create: async () => ({ id: 'promo_1' }) },
  });
  const services = (prix = true) => ({
    db,
    stripe: faux(prix),
    urlSite: 'https://ph.test',
    horloge: () => T,
  });

  let enCours: { cle: string; option?: boolean } = { cle: 'ph_fiche_pro' };
  beforeEach(() => {
    appels.length = 0;
    enCours = { cle: 'ph_fiche_pro' };
  });

  it('option Blog (D71) : ajoutée au prorata en Site Pro, retirée, refusée en Tout inclus', async () => {
    await db.doc(chemins.facturationPrivee('a1')).set({ stripeSubscriptionId: 'sub_1' });
    await db.doc(chemins.artisan('a1')).update({ 'droits.formule': 'site_pro' });
    enCours = { cle: 'ph_site_pro' };
    await changerOptionBlog(services(), { artisanId: 'a1', activer: true });
    expect(appels.find((a) => a.type === 'maj')!.p).toEqual({
      items: [{ price: 'price_pa', quantity: 1 }],
      proration_behavior: 'always_invoice',
    });
    appels.length = 0;
    enCours = { cle: 'ph_site_pro', option: true };
    await changerOptionBlog(services(), { artisanId: 'a1', activer: true });
    expect(appels).toHaveLength(0);
    await changerOptionBlog(services(), { artisanId: 'a1', activer: false });
    expect(appels.find((a) => a.type === 'maj')!.p).toEqual({
      items: [{ id: 'si_blog', deleted: true }],
      proration_behavior: 'none',
    });
    await db.doc(chemins.artisan('a1')).update({ 'droits.formule': 'tout_inclus' });
    await expect(
      changerOptionBlog(services(), { artisanId: 'a1', activer: true }),
    ).rejects.toMatchObject({ code: 'PRECONDITION' });
  });

  it('montée Site Pro + option → Tout inclus : l’option est retirée de l’abonnement', async () => {
    await db.doc(chemins.facturationPrivee('a1')).set({ stripeSubscriptionId: 'sub_1' });
    await db.doc(chemins.artisan('a1')).update({ 'droits.formule': 'site_pro' });
    enCours = { cle: 'ph_site_pro', option: true };
    await changerFormule(services(), {
      artisanId: 'a1',
      email: 'p@test.local',
      produit: 'tout_inclus',
    });
    expect(appels.find((a) => a.type === 'maj')!.p).toMatchObject({
      items: [
        { id: 'si_1', price: 'price_pa' },
        { id: 'si_blog', deleted: true },
      ],
    });
  });

  it('sans abonnement : client Stripe créé une seule fois, session Checkout avec l’entreprise', async () => {
    const e = { artisanId: 'a1', email: 'p@test.local', produit: 'tout_inclus' as const };
    expect(await changerFormule(services(), e)).toEqual({
      mode: 'checkout',
      url: 'https://checkout.stripe.com/c/cs_1',
    });
    await changerFormule(services(), e);
    expect(appels.filter((a) => a.type === 'client')).toHaveLength(1);
    const session = appels.find((a) => a.type === 'session')!.p;
    expect(session).toMatchObject({
      mode: 'subscription',
      customer: 'cus_nouveau',
      client_reference_id: 'a1',
      line_items: [{ price: 'price_pa', quantity: 1 }],
      subscription_data: { metadata: { artisanId: 'a1', produit: 'tout_inclus' } },
      allow_promotion_codes: true,
      cancel_url: 'https://ph.test/pro/abonnement',
    });
  });

  it('refuse la formule déjà active et une offre sans prix Stripe', async () => {
    const e = { artisanId: 'a1', email: 'p@test.local', produit: 'fiche_pro' as const };
    await expect(changerFormule(services(false), e)).rejects.toMatchObject({
      code: 'INDISPONIBLE',
    });
    await db.doc(chemins.artisan('a1')).update({ 'droits.formule': 'fiche_pro' });
    await expect(changerFormule(services(), e)).rejects.toMatchObject({ code: 'PRECONDITION' });
  });

  it('PAY-03 : montée Fiche Pro → Tout inclus, prorata facturé tout de suite', async () => {
    await db.doc(chemins.artisan('a1')).update({ 'droits.formule': 'fiche_pro' });
    await db.doc(chemins.facturationPrivee('a1')).set({ stripeSubscriptionId: 'sub_1' });
    expect(
      await changerFormule(services(), {
        artisanId: 'a1',
        email: 'p@test.local',
        produit: 'tout_inclus',
      }),
    ).toEqual({ mode: 'montee', formule: 'tout_inclus' });
    expect(appels.find((a) => a.type === 'maj')!.p).toMatchObject({
      items: [{ id: 'si_1', price: 'price_pa' }],
      proration_behavior: 'always_invoice',
    });
    expect(appels.some((a) => a.type === 'session')).toBe(false);
  });

  it('PAY-04 : descente Tout inclus → Site Pro, effective à l’échéance', async () => {
    await db.doc(chemins.artisan('a1')).update({ 'droits.formule': 'tout_inclus' });
    await db.doc(chemins.facturationPrivee('a1')).set({ stripeSubscriptionId: 'sub_1' });
    expect(
      await changerFormule(services(), {
        artisanId: 'a1',
        email: 'p@test.local',
        produit: 'site_pro',
      }),
    ).toEqual({ mode: 'descente', formule: 'site_pro' });
    const planning = appels.find((a) => a.type === 'planning')!.p as {
      phases: { items: { price: string }[]; end_date?: number }[];
    };
    expect(planning.phases).toHaveLength(2);
    expect(planning.phases[0]!.end_date).toBe(2);
    expect(planning.phases[1]!.items[0]!.price).toBe('price_pa');
    expect(appels.some((a) => a.type === 'maj')).toBe(false);
  });

  it('pack de crédits : prix du catalogue, crédits en métadonnées ; pack inconnu refusé', async () => {
    await creerCheckoutPaiement(services(), {
      artisanId: 'a1',
      email: 'p@test.local',
      type: 'pack',
      cle: 'credits_100',
    });
    expect(appels.find((a) => a.type === 'session')!.p).toMatchObject({
      mode: 'payment',
      line_items: [{ price: 'price_pa', quantity: 1 }],
      metadata: { type: 'pack', artisanId: 'a1', credits: '110' },
    });
    await expect(
      creerCheckoutPaiement(services(), {
        artisanId: 'a1',
        email: 'p@test.local',
        type: 'pack',
        cle: 'tout_inclus',
      }),
    ).rejects.toMatchObject({ code: 'ENTREE_INVALIDE' });
  });

  it('déblocage par carte : prix recalculé côté serveur, rien d’écrit avant le paiement', async () => {
    await appelOffresOuvert('ao1');
    await creerCheckoutPaiement(services(), {
      artisanId: 'a1',
      email: 'p@test.local',
      type: 'lead',
      appelOffresId: 'ao1',
      uid: 'p1',
    });
    expect(appels.find((a) => a.type === 'session')!.p).toMatchObject({
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: 1900 } }],
      metadata: { type: 'lead', appelOffresId: 'ao1', uid: 'p1', centimes: '1900' },
    });
    expect((await db.doc(chemins.appelOffres('ao1')).get()).get('nbDeblocages')).toBe(0);
    await db.doc(chemins.appelOffres('ao1')).update({ statut: 'complet' });
    await expect(
      creerCheckoutPaiement(services(), {
        artisanId: 'a1',
        email: 'p@test.local',
        type: 'lead',
        appelOffresId: 'ao1',
        uid: 'p1',
      }),
    ).rejects.toMatchObject({ code: 'CONFLIT' });
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
        numero: 'PT-0001',
        montantTtcCentimes: 115_056,
        statut: 'paid',
        hostedUrl: 'https://invoice.stripe.com/i/x',
        createdAt: Timestamp.fromMillis(T),
      });
    const f = await lireFacturation(db, 'a1');
    expect(f.abonnements.map((a) => [a.id, a.produit, a.periode])).toEqual([
      ['sub_1', 'tout_inclus', 'mensuel'],
    ]);
    expect(f.factures).toEqual([
      {
        id: 'in_1',
        numero: 'PT-0001',
        montantTtcCentimes: 115_056,
        statut: 'paid',
        date: T,
        lien: 'https://invoice.stripe.com/i/x',
      },
    ]);
  });
});
