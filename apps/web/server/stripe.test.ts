import Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { lireEvenementStripe } = await import('./stripe');

const SECRET = 'whsec_test_secret';
const corps = JSON.stringify({
  id: 'evt_1',
  type: 'invoice.paid',
  created: 1,
  data: { object: {} },
});

describe('lireEvenementStripe', () => {
  it('accepte un événement correctement signé', () => {
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: corps, secret: SECRET });
    expect(lireEvenementStripe(corps, signature, SECRET).id).toBe('evt_1');
  });
  it('refuse une signature fausse, absente, ou un corps modifié', () => {
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: corps,
      secret: 'whsec_autre',
    });
    expect(() => lireEvenementStripe(corps, signature, SECRET)).toThrow();
    expect(() => lireEvenementStripe(corps, null, SECRET)).toThrow();
    const bonne = Stripe.webhooks.generateTestHeaderString({ payload: corps, secret: SECRET });
    expect(() => lireEvenementStripe(corps.replace('evt_1', 'evt_2'), bonne, SECRET)).toThrow();
  });
});
