import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import { calculerCycles, expirerCodes, planifierCycle } from '../src/serveur/cycle';
import {
  creerCheckoutAbonnement,
  traiterEvenementStripe,
  type EvenementStripe,
} from '../src/serveur/facturation';

/** CONV-01, CONV-02 : gratuit → offre J+14 avec code personnel → paiement avec le code. */
let db: Firestore;
const J = 86_400_000;
// Mardi 6 octobre 2026, 7 h à Paris.
const T0 = Date.UTC(2026, 9, 6, 5);
const envois: { modele: string; donnees?: Record<string, unknown> }[] = [];
const cycle = (t: number) => ({
  db,
  horloge: () => t,
  notifier: async (e: unknown) => void envois.push(e as (typeof envois)[number]),
});
const appels: { type: string; p: Record<string, unknown> }[] = [];
let coupons = 0;
const stripe = {
  customers: { create: async () => ({ id: 'cus_1' }) },
  prices: {
    list: async () => ({ data: [{ id: 'price_va', lookup_key: 'ph_visibilite_annuel' }] }),
  },
  checkout: {
    sessions: {
      create: async (p: Record<string, unknown>) => (
        appels.push({ type: 'session', p }),
        { id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1' }
      ),
    },
  },
  billingPortal: { sessions: { create: async () => ({ url: 'x' }) } },
  refunds: { create: async () => ({ id: 're_1' }) },
  coupons: {
    create: async (p: Record<string, unknown>) => {
      appels.push({ type: 'coupon', p });
      if (coupons++) throw Object.assign(new Error('existe'), { code: 'resource_already_exists' });
      return { id: p.id as string };
    },
  },
  promotionCodes: {
    create: async (p: Record<string, unknown>) => (
      appels.push({ type: 'promo', p }),
      { id: `promo_${appels.length}` }
    ),
  },
};
const checkout = (t: number) => ({ db, stripe, urlSite: 'https://ph.test', horloge: () => t });

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  envois.length = 0;
  appels.length = 0;
  coupons = 0;
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await db.doc(chemins.artisan('a1')).set({
    nomCommercial: 'Élec Dupont',
    statut: 'actif',
    enLigne: true,
    plan: 'gratuit',
    optionVisibilite: false,
    metiers: ['electricien'],
    metierPrincipal: 'electricien',
    adresseSiege: { ville: 'Bordeaux' },
    completude: 80,
    proprietaireUid: 'u1',
    siegesMax: 1,
  });
  await db.doc(chemins.membre('a1', 'u1')).set({ role: 'proprietaire', statut: 'actif' });
});

const etat = async () => (await db.collection(collections.cycleEtat).doc('a1').get()).data()!;
const traces = async (type: string) =>
  (await db.collection(collections.cycleTraces).where('type', '==', type).get()).docs.map((d) =>
    d.data(),
  );

async function jusquALOffre() {
  await calculerCycles(cycle(T0));
  await db
    .collection(collections.cycleEtat)
    .doc('a1')
    .update({
      groupeTemoin: false,
      signaux: { vues7j: 31, position: 14, total: 22, vuesMisesEnAvant: 312 },
    });
  await planifierCycle(cycle(T0 + 3 * J));
  await planifierCycle(cycle(T0 + 14 * J));
  return envois.find((e) => e.modele === 'vis-offre-lancement')!;
}

describe('codes promo personnels (CONVERSION §6)', () => {
  it('J+14 : code réservé, personnel, à usage unique, expirant le 3e jour à 23 h 59', async () => {
    const offre = await jusquALOffre();
    expect(envois.map((e) => e.modele)).toEqual(['vis-position', 'vis-offre-lancement']);
    const code = offre.donnees!.code as string;
    expect(code).toMatch(/^ELECDUPO30[A-Z2-9]{4}$/);
    expect(offre.donnees).toMatchObject({
      pourcentage: 30,
      expire: 'vendredi 23 octobre à 23 h 59',
      lien: `https://portailhabitat.fr/pro/abonnement/visibilite?facturation=annuel&code=${code}`,
    });
    const doc = (await db.collection(collections.codesPromo).doc(code).get()).data()!;
    expect(doc).toMatchObject({
      source: 'conversion',
      artisanId: 'a1',
      pourcentage: 30,
      dureeMois: 12,
      produits: ['visibilite'],
      maxUtilisations: 1,
      utilisations: 0,
      actif: true,
    });
    expect(doc.stripePromotionCodeId).toBeUndefined();
    expect((doc.expireLe as Timestamp).toDate().toISOString()).toBe('2026-10-23T21:59:00.000Z');
    expect((await etat()).codeActif).toMatchObject({ code, utilise: false });
    expect((await traces('code_cree')).map((t) => t.details.code)).toEqual([code]);
  });

  it('rappel J+17 : seulement si l’offre a été ouverte, avec le même code', async () => {
    const offre = await jusquALOffre();
    await planifierCycle(cycle(T0 + 17 * J));
    expect(envois.map((e) => e.modele)).not.toContain('vis-offre-rappel');
    expect((await traces('email_annule')).map((t) => t.raison)).toContain('offre_non_ouverte');

    // Même scénario, offre ouverte.
    await db
      .collection(collections.cycleEtat)
      .doc('a1')
      .update({ 'sequence.etape': 4, 'sequence.prochainEnvoi': Timestamp.fromMillis(T0) });
    await db.collection(collections.emails).add({
      uid: 'u1',
      modele: 'vis-offre-lancement',
      categorie: 'offres_pro',
      statut: 'delivre',
      ouvertLe: Timestamp.fromMillis(T0 + 14 * J),
      createdAt: Timestamp.fromMillis(T0 + 14 * J),
      envoyerLe: Timestamp.fromMillis(T0 + 14 * J),
    });
    await planifierCycle(cycle(T0 + 17 * J + 3_600_000));
    const rappel = envois.find((e) => e.modele === 'vis-offre-rappel')!;
    expect(rappel.donnees!.code).toBe(offre.donnees!.code);
    expect((await db.collection(collections.codesPromo).get()).size).toBe(1);
  });

  it('une seule remise par 90 jours : la relance J+90 est annulée', async () => {
    await jusquALOffre();
    await db
      .collection(collections.cycleEtat)
      .doc('a1')
      .update({ 'sequence.etape': 5, 'sequence.prochainEnvoi': Timestamp.fromMillis(T0) });
    await planifierCycle(cycle(T0 + 90 * J));
    expect(envois.map((e) => e.modele)).not.toContain('vis-offre-relance');
    expect((await traces('email_annule')).map((t) => t.raison)).toContain('remise_refusee');
  });

  it('paiement avec le code : appliqué sans saisie, marqué utilisé, plus aucune offre', async () => {
    const code = (await jusquALOffre()).donnees!.code as string;
    const e = {
      artisanId: 'a1',
      email: 'p@test.local',
      produit: 'visibilite' as const,
      periode: 'annuel' as const,
      code,
    };
    await creerCheckoutAbonnement(checkout(T0 + 15 * J), e);
    await creerCheckoutAbonnement(checkout(T0 + 15 * J), e);
    const promos = appels.filter((a) => a.type === 'promo');
    expect(promos).toHaveLength(1);
    expect(promos[0]!.p).toMatchObject({
      promotion: { type: 'coupon', coupon: 'ph_conv_30_12m' },
      code,
      customer: 'cus_1',
      max_redemptions: 1,
      expires_at: Math.floor(Date.UTC(2026, 9, 23, 21, 59) / 1000),
    });
    expect(appels.find((a) => a.type === 'coupon')!.p).toMatchObject({
      percent_off: 30,
      duration: 'repeating',
      duration_in_months: 12,
    });
    const session = appels.filter((a) => a.type === 'session')[1]!.p;
    const promoId = (await db.collection(collections.codesPromo).doc(code).get()).get(
      'stripePromotionCodeId',
    ) as string;
    expect(promoId).toMatch(/^promo_/);
    expect(session.discounts).toEqual([{ promotion_code: promoId }]);
    expect(session.allow_promotion_codes).toBeUndefined();
    expect(session.subscription_data).toMatchObject({ metadata: { codePromo: code } });

    // Code d'une autre entreprise, ou expiré : refusé.
    await db.doc(chemins.artisan('autre')).set({ plan: 'gratuit', optionVisibilite: false });
    await expect(
      creerCheckoutAbonnement(checkout(T0 + 15 * J), { ...e, artisanId: 'autre' }),
    ).rejects.toMatchObject({ code: 'PRECONDITION' });
    await expect(creerCheckoutAbonnement(checkout(T0 + 18 * J), e)).rejects.toMatchObject({
      code: 'PRECONDITION',
    });

    const ev: EvenementStripe = {
      id: 'evt_code',
      type: 'customer.subscription.created',
      created: Math.floor((T0 + 15 * J) / 1000),
      data: {
        object: {
          id: 'sub_1',
          customer: 'cus_1',
          status: 'active',
          metadata: { artisanId: 'a1', produit: 'visibilite', codePromo: code },
          cancel_at_period_end: false,
          canceled_at: null,
          items: {
            data: [
              {
                price: { id: 'price_va', lookup_key: 'ph_visibilite_annuel' },
                quantity: 1,
                current_period_start: Math.floor((T0 + 15 * J) / 1000),
                current_period_end: Math.floor((T0 + 380 * J) / 1000),
              },
            ],
          },
        },
      },
    };
    await traiterEvenementStripe({ ...cycle(T0 + 15 * J), auth: getAuth(appAdmin()) } as never, ev);
    expect((await db.collection(collections.codesPromo).doc(code).get()).data()).toMatchObject({
      utilisations: 1,
      actif: false,
    });
    expect(await etat()).toMatchObject({
      etape: 'visibilite',
      codeActif: { utilise: true },
      sequence: { id: 'S6' },
    });
    expect((await traces('code_utilise')).length).toBe(1);
    expect((await traces('conversion')).map((t) => t.details.etape)).toEqual(['visibilite']);
    envois.length = 0;
    await planifierCycle(cycle(T0 + 17 * J + 3_600_000));
    expect(envois.filter((x) => x.modele.startsWith('vis-'))).toEqual([]);
  });

  it('cycleCodesExpires : code passé désactivé et tracé', async () => {
    const code = (await jusquALOffre()).donnees!.code as string;
    expect(await expirerCodes(db, T0 + 17 * J)).toBe(0);
    expect(await expirerCodes(db, T0 + 18 * J)).toBe(1);
    expect((await db.collection(collections.codesPromo).doc(code).get()).get('actif')).toBe(false);
    expect((await traces('code_expire')).map((t) => t.details.code)).toEqual([code]);
  });
});
