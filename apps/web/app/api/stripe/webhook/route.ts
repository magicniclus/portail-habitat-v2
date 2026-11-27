import { traiterEvenementStripe } from '@ph/firebase/facturation';
import { servicesComptes } from '@/server/espace';
import { lireEvenementStripe } from '@/server/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook Stripe (INTEGRATIONS §1) : signature vérifiée sur le corps brut, puis traitement
 * idempotent. 400 : signature refusée (Stripe n'insiste pas) ; 500 : erreur, Stripe renverra.
 */
export async function POST(requete: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ erreur: 'Paiements non configurés' }, { status: 503 });
  let evenement;
  try {
    evenement = lireEvenementStripe(
      await requete.text(),
      requete.headers.get('stripe-signature'),
      secret,
    );
  } catch {
    return Response.json({ erreur: 'Signature invalide' }, { status: 400 });
  }
  try {
    const resultat = await traiterEvenementStripe(servicesComptes(), evenement);
    return Response.json({ recu: true, resultat });
  } catch {
    // Le détail est noté dans stripeEvents/{id} (jamais de données personnelles dans les logs).
    return Response.json({ erreur: 'Traitement impossible pour le moment' }, { status: 500 });
  }
}
