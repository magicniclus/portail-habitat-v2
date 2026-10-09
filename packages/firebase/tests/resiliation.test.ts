import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { collections } from '../src/chemins';
import {
  accepterAlternative,
  confirmerResiliation,
  lireResiliation,
  proposerAlternative,
} from '../src/serveur/facturation';

/** Parcours de résiliation (CONVERSION §3 S8). */
let db: Firestore;
const J = 86_400_000;
const T = Date.UTC(2026, 9, 6, 8);
const appels: { type: string; id?: string; p: Record<string, unknown> }[] = [];
let couponExiste = false;
const stripe = {
  coupons: {
    create: async (p: Record<string, unknown>) => {
      appels.push({ type: 'coupon', p });
      if (couponExiste)
        throw Object.assign(new Error('existe'), { code: 'resource_already_exists' });
      couponExiste = true;
      return { id: p.id as string };
    },
  },
  subscriptions: {
    update: async (id: string, p: Record<string, unknown>) => (
      appels.push({ type: 'maj', id, p }),
      { id }
    ),
  },
} as never;
const s = () => ({ db, horloge: () => T, stripe });
const e = { artisanId: 'a1', abonnementId: 'sub_p' };

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  appels.length = 0;
  couponExiste = false;
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  const abo = (id: string, artisanId: string, produit: string, p: Record<string, unknown> = {}) =>
    db
      .collection(collections.abonnements)
      .doc(id)
      .set({
        artisanId,
        produit,
        periode: 'mensuel',
        statut: 'active',
        annulationFinPeriode: false,
        finPeriode: Timestamp.fromMillis(T + 20 * J),
        ...p,
      });
  await abo('sub_p', 'a1', 'premium');
  await abo('sub_old', 'a1', 'visibilite', { statut: 'canceled' });
  await abo('sub_x', 'autre', 'premium');
});

describe('parcours de résiliation', () => {
  it('abonnements résiliables ; alternative selon la raison, calculée côté serveur', async () => {
    expect((await lireResiliation(db, 'a1')).abonnements.map((a) => a.id)).toEqual(['sub_p']);
    expect(await proposerAlternative(s(), { ...e, raison: 'trop_cher' })).toEqual({
      type: 'descendre',
    });
    expect(await proposerAlternative(s(), { ...e, raison: 'saison_creuse' })).toEqual({
      type: 'suspendre',
      mois: 2,
    });
  });

  it('−50 % pendant 2 mois appliqué chez Stripe, puis plus d’offre avant 12 mois : un appel', async () => {
    expect(await accepterAlternative(s(), { ...e, raison: 'pas_assez_demandes' })).toMatchObject({
      type: 'remise',
    });
    expect(appels).toEqual([
      {
        type: 'coupon',
        p: expect.objectContaining({
          percent_off: 50,
          duration: 'repeating',
          duration_in_months: 2,
        }),
      },
      { type: 'maj', id: 'sub_p', p: { discounts: [{ coupon: 'ph_retention_50_2m' }] } },
    ]);
    expect(await accepterAlternative(s(), { ...e, raison: 'saison_creuse' })).toEqual({
      type: 'appel',
    });
    const taches = await db.collection(collections.filesModeration).get();
    expect(taches.docs.map((d) => [d.get('type'), d.get('refs')])).toEqual([
      ['risque_resiliation', { artisanId: 'a1' }],
    ]);
    const traces = await db
      .collection(collections.cycleTraces)
      .where('type', '==', 'retention')
      .get();
    expect(traces.docs.map((d) => d.get('details.alternative')).sort()).toEqual([
      'appel',
      'remise',
    ]);
  });

  it('suspension de 2 mois : facturation suspendue, reprise automatique', async () => {
    await accepterAlternative(s(), { ...e, raison: 'saison_creuse' });
    expect(appels).toEqual([
      {
        type: 'maj',
        id: 'sub_p',
        p: { pause_collection: { behavior: 'void', resumes_at: Math.floor((T + 60 * J) / 1000) } },
      },
    ]);
  });

  it('confirmation : fin de période chez Stripe avec la raison ; abonnement d’une autre entreprise refusé', async () => {
    expect(await confirmerResiliation(s(), { ...e, raison: 'autre' })).toEqual({
      finPeriode: T + 20 * J,
    });
    expect(appels).toEqual([
      {
        type: 'maj',
        id: 'sub_p',
        p: { cancel_at_period_end: true, metadata: { raisonResiliation: 'autre' } },
      },
    ]);
    await expect(
      confirmerResiliation(s(), { artisanId: 'a1', abonnementId: 'sub_x', raison: 'autre' }),
    ).rejects.toMatchObject({ code: 'INTROUVABLE' });
  });
});
