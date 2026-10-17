import 'server-only';
import type { ClientStripe, EvenementStripe } from '@ph/firebase/facturation';
import Stripe from 'stripe';

/**
 * Client Stripe côté serveur uniquement (`STRIPE_SECRET_KEY`, clé restreinte de préférence).
 * `null` sans clé : paiements indisponibles (développement, e2e), le reste du site fonctionne.
 */
let client: Stripe | null | undefined;
export function stripe(): Stripe | null {
  if (client === undefined) {
    const cle = process.env.STRIPE_SECRET_KEY;
    client = cle ? new Stripe(cle, { appInfo: { name: 'Portail Habitat' } }) : null;
  }
  return client;
}

/** Même client, vu à travers le sous-ensemble d'API utilisé par `@ph/firebase/facturation`. */
export const clientStripe = (): ClientStripe | null => stripe() as unknown as ClientStripe | null;

/**
 * Événement authentifié par sa signature (corps brut + en-tête `stripe-signature`) ; lève une
 * erreur si la signature est absente, fausse ou trop ancienne (5 minutes).
 */
export function lireEvenementStripe(
  corps: string,
  signature: string | null,
  secret: string,
): EvenementStripe {
  if (!signature) throw new Error('Signature Stripe absente');
  return Stripe.webhooks.constructEvent(corps, signature, secret) as unknown as EvenementStripe;
}
