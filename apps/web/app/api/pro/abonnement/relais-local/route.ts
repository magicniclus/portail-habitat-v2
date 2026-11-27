import { traiterEvenementStripe, type EvenementStripe } from '@ph/firebase/facturation';
import { z } from '@ph/core/zod';
import { action } from '@/server/action';
import { servicesComptes } from '@/server/espace';
import { routeJson } from '@/server/json';
import { stripe } from '@/server/stripe';

export const dynamic = 'force-dynamic';

/** Événements que le webhook sait traiter (`GESTIONNAIRES` de `@ph/firebase/facturation`). */
const TYPES = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
];

/**
 * Développement seulement (`pnpm dev`, clés Stripe de test) : Stripe ne peut pas joindre
 * l'ordinateur, alors les événements de la dernière heure sont relus chez Stripe (API, clé
 * secrète) et passés au même traitement idempotent que le webhook. Les droits viennent donc
 * toujours d'événements Stripe authentiques (règle 4). Absent en production (404).
 */
const relayer = action(
  {
    schema: z.strictObject({}),
    nom: 'relaisStripeLocal',
    rateLimit: { cle: 'relais-stripe-local', max: 600, fenetre: '1h' },
  },
  async () => {
    const client = stripe();
    if (!client) return { relayes: 0 };
    const liste = await client.events.list({
      created: { gte: Math.floor(Date.now() / 1000) - 3600 },
      types: TYPES,
      limit: 50,
    });
    let relayes = 0;
    for (const ev of [...liste.data].sort((a, b) => a.created - b.created))
      if (
        (await traiterEvenementStripe(servicesComptes(), ev as unknown as EvenementStripe)) ===
        'traite'
      )
        relayes++;
    return { relayes };
  },
);

export const POST = (requete: Request) =>
  process.env.NODE_ENV === 'development'
    ? routeJson(requete, relayer)
    : Response.json({ erreur: 'Introuvable' }, { status: 404 });
