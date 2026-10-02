import { ErreurMetier } from '@ph/core/erreurs';
import {
  CATALOGUE_STRIPE,
  cleStripe,
  prixAbonnement,
  type ProduitAbonnement,
} from '@ph/core/facturation';
import type { Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { debloquerAppelOffres } from '../matching/deblocage';
import type { ClientStripe } from './stripe';

/**
 * Stripe Checkout et portail client (INTEGRATIONS §1, règle 7 : aucune saisie de carte chez nous).
 * Le client Stripe est créé au premier paiement et gardé dans `artisans/{id}/prive/facturation`.
 */

export interface ServicesCheckout {
  db: Firestore;
  stripe: ClientStripe;
  urlSite: string;
  horloge: () => number;
}

async function clientStripe(
  s: ServicesCheckout,
  artisanId: string,
  email: string,
  nom: string,
): Promise<string> {
  const ref = s.db.doc(chemins.facturationPrivee(artisanId));
  const connu = (await ref.get()).get('stripeCustomerId') as string | undefined;
  if (connu) return connu;
  const { id } = await s.stripe.customers.create({
    email,
    ...(nom ? { name: nom } : {}),
    metadata: { artisanId },
  });
  await ref.set({ stripeCustomerId: id }, { merge: true });
  return id;
}

/** Abonnement Premium ou Visibilité : session Checkout ; la page de retour attend le webhook (PAY-01). */
export async function creerCheckoutAbonnement(
  s: ServicesCheckout,
  p: {
    artisanId: string;
    email: string;
    produit: ProduitAbonnement;
    periode: 'annuel' | 'mensuel';
  },
): Promise<{ url: string }> {
  const artisan = await s.db.doc(chemins.artisan(p.artisanId)).get();
  if (!artisan.exists) throw new ErreurMetier('INTROUVABLE');
  if (artisan.get('plan') === 'premium')
    throw new ErreurMetier('PRECONDITION', 'Votre entreprise est déjà Premium.');
  if (p.produit === 'visibilite' && artisan.get('optionVisibilite') === true)
    throw new ErreurMetier('PRECONDITION', 'L’option Visibilité est déjà active.');
  const cle = cleStripe(prixAbonnement(p.produit, p.periode).cle);
  const [prix] = (await s.stripe.prices.list({ lookup_keys: [cle], active: true })).data;
  if (!prix)
    throw new ErreurMetier('INDISPONIBLE', 'Cette offre n’est pas disponible pour le moment.');
  const customer = await clientStripe(
    s,
    p.artisanId,
    p.email,
    (artisan.get('nomCommercial') as string | undefined) ?? '',
  );
  const metadata = { artisanId: p.artisanId, produit: p.produit };
  const session = await s.stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: p.artisanId,
    line_items: [{ price: prix.id, quantity: 1 }],
    metadata,
    subscription_data: { metadata },
    allow_promotion_codes: true,
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    billing_address_collection: 'required',
    customer_update: { address: 'auto', name: 'auto' },
    locale: 'fr',
    success_url: `${s.urlSite}/pro/abonnement/confirme?produit=${p.produit}`,
    cancel_url: `${s.urlSite}/pro/abonnement/${p.produit}?facturation=${p.periode}`,
  });
  if (!session.url) throw new ErreurMetier('INDISPONIBLE');
  return { url: session.url };
}

export type AchatCarte =
  { type: 'pack'; cle: string } | { type: 'lead'; appelOffresId: string; uid: string };

/**
 * Paiement unique par carte (MATCHING [8], PRO-05) : pack de crédits au prix du catalogue, ou
 * déblocage d'un appel d'offres au prix recalculé ici (les vérifications du déblocage passent
 * d'abord, sans rien écrire). Le webhook crédite ou débloque à réception du paiement.
 */
export async function creerCheckoutPaiement(
  s: ServicesCheckout,
  p: { artisanId: string; email: string } & AchatCarte,
): Promise<{ url: string }> {
  const artisan = await s.db.doc(chemins.artisan(p.artisanId)).get();
  if (!artisan.exists) throw new ErreurMetier('INTROUVABLE');
  const nom = (artisan.get('nomCommercial') as string | undefined) ?? '';
  let ligne: Record<string, unknown>;
  let metadata: Record<string, string>;
  let retour: string;
  if (p.type === 'pack') {
    const pack = CATALOGUE_STRIPE.find((c) => c.produit === 'pack' && c.cle === p.cle);
    if (!pack?.credits) throw new ErreurMetier('ENTREE_INVALIDE', 'Pack inconnu.');
    const [prix] = (
      await s.stripe.prices.list({ lookup_keys: [cleStripe(pack.cle)], active: true })
    ).data;
    if (!prix)
      throw new ErreurMetier('INDISPONIBLE', 'Ce pack n’est pas disponible pour le moment.');
    ligne = { price: prix.id, quantity: 1 };
    metadata = { type: 'pack', artisanId: p.artisanId, credits: String(pack.credits) };
    retour = '/pro/facturation';
  } else {
    const verif = await debloquerAppelOffres(s, {
      appelOffresId: p.appelOffresId,
      artisanId: p.artisanId,
      uid: p.uid,
      choix: 'carte',
    });
    if (verif.etat !== 'paiement_requis')
      throw new ErreurMetier('CONFLIT', 'Ce chantier est déjà débloqué.');
    ligne = {
      quantity: 1,
      price_data: {
        currency: 'eur',
        unit_amount: verif.centimes,
        tax_behavior: 'exclusive',
        product_data: { name: 'Coordonnées d’un appel d’offres' },
      },
    };
    metadata = {
      type: 'lead',
      artisanId: p.artisanId,
      appelOffresId: p.appelOffresId,
      uid: p.uid,
      centimes: String(verif.centimes),
    };
    retour = '/pro/appels-d-offres';
  }
  const customer = await clientStripe(s, p.artisanId, p.email, nom);
  const session = await s.stripe.checkout.sessions.create({
    mode: 'payment',
    customer,
    client_reference_id: p.artisanId,
    line_items: [ligne],
    metadata,
    payment_intent_data: { metadata },
    invoice_creation: { enabled: true },
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    billing_address_collection: 'required',
    customer_update: { address: 'auto', name: 'auto' },
    locale: 'fr',
    success_url: `${s.urlSite}${retour}?paiement=ok`,
    cancel_url: `${s.urlSite}${retour}`,
  });
  if (!session.url) throw new ErreurMetier('INDISPONIBLE');
  return { url: session.url };
}

/** Portail client Stripe : carte, factures, résiliation en fin de période. */
export async function ouvrirPortailClient(
  s: ServicesCheckout,
  artisanId: string,
): Promise<{ url: string }> {
  const customer = (await s.db.doc(chemins.facturationPrivee(artisanId)).get()).get(
    'stripeCustomerId',
  ) as string | undefined;
  if (!customer)
    throw new ErreurMetier('PRECONDITION', 'Aucun abonnement n’a encore été souscrit.');
  const { url } = await s.stripe.billingPortal.sessions.create({
    customer,
    return_url: `${s.urlSite}/pro/facturation`,
  });
  return { url };
}
