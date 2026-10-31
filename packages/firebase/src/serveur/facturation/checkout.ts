import { ErreurMetier } from '@ph/core/erreurs';
import {
  CATALOGUE_STRIPE,
  cleStripe,
  lirePrix,
  prixAbonnement,
  type ProduitAbonnement,
} from '@ph/core/facturation';
import {
  inclut,
  NOMS_FORMULE,
  optionBlogPossible,
  PRIX_FORMULES_HT,
  type Formule,
} from '@ph/core/paiements';
import type { Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { codeStripe, lireCodeValable } from '../cycle/codes';
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

async function prixStripe(s: ServicesCheckout, cle: string): Promise<string> {
  const [prix] = (await s.stripe.prices.list({ lookup_keys: [cleStripe(cle)], active: true })).data;
  if (!prix)
    throw new ErreurMetier('INDISPONIBLE', 'Cette offre n’est pas disponible pour le moment.');
  return prix.id;
}

/**
 * CGV acceptées sur la page Stripe (choix du propriétaire, 27/10/2026) : case obligatoire avec
 * lien vers nos CGV. Stripe l'exige seulement si l'URL des conditions est renseignée dans les
 * informations publiques du compte ; sinon, on retombe sur une mention sous le bouton de paiement.
 */
async function creerSession(
  s: ServicesCheckout,
  p: Record<string, unknown>,
): Promise<{ id: string; url: string | null }> {
  const cgv = `[conditions générales de vente](${s.urlSite}/legal/pro/cgv)`;
  try {
    return await s.stripe.checkout.sessions.create({
      ...p,
      consent_collection: { terms_of_service: 'required' },
      custom_text: { terms_of_service_acceptance: { message: `J’accepte les ${cgv}.` } },
    });
  } catch (e) {
    if (!/terms of service/i.test(e instanceof Error ? e.message : '')) throw e;
    return s.stripe.checkout.sessions.create({
      ...p,
      custom_text: { submit: { message: `En payant, vous acceptez nos ${cgv}.` } },
    });
  }
}

export type ChangementFormule =
  { mode: 'checkout'; url: string } | { mode: 'montee' | 'descente'; formule: ProduitAbonnement };

/**
 * Changement de formule (PAIEMENTS §4, PAY-02 à PAY-04). Sans abonnement : session Checkout
 * (aucune saisie de carte chez nous, règle 7). Avec abonnement : montée immédiate avec prorata
 * facturé tout de suite, descente à l'échéance (planning Stripe). `droits` ne change que par le
 * webhook : l'écran attend sa mise à jour.
 */
export async function changerFormule(
  s: ServicesCheckout,
  p: {
    artisanId: string;
    email: string;
    produit: ProduitAbonnement;
    /** Code personnel reçu par email (CONVERSION §6) : appliqué sans saisie. */
    code?: string;
  },
): Promise<ChangementFormule> {
  const [artisan, prive] = await Promise.all([
    s.db.doc(chemins.artisan(p.artisanId)).get(),
    s.db.doc(chemins.facturationPrivee(p.artisanId)).get(),
  ]);
  if (!artisan.exists) throw new ErreurMetier('INTROUVABLE');
  const actuelle = (artisan.get('droits.formule') as Formule | undefined) ?? 'gratuit';
  if (actuelle === p.produit)
    throw new ErreurMetier('PRECONDITION', `Vous avez déjà ${NOMS_FORMULE[p.produit]}.`);
  const prixId = await prixStripe(s, prixAbonnement(p.produit).cle);
  const subId = prive.get('stripeSubscriptionId') as string | undefined;

  if (actuelle !== 'gratuit' && subId) {
    const sub = await s.stripe.subscriptions.retrieve(subId);
    const element = sub.items.data.find((e) => lirePrix(e.price.lookup_key)?.type === 'abonnement');
    if (!element) throw new ErreurMetier('INDISPONIBLE');
    // Option Blog (D71) : retirée si la nouvelle formule ne la permet pas (Tout inclus, sans site).
    const option = sub.items.data.find((e) => lirePrix(e.price.lookup_key)?.type === 'option_blog');
    const garderOption = Boolean(option) && optionBlogPossible(p.produit);
    const metadata = { artisanId: p.artisanId, produit: p.produit };
    const montee =
      inclut(p.produit, actuelle as ProduitAbonnement) ||
      PRIX_FORMULES_HT[p.produit] > PRIX_FORMULES_HT[actuelle as ProduitAbonnement];
    if (montee) {
      await s.stripe.subscriptions.update(subId, {
        items: [
          { id: element.id ?? '', price: prixId },
          ...(option && !garderOption ? [{ id: option.id ?? '', deleted: true as const }] : []),
        ],
        proration_behavior: 'always_invoice',
        cancel_at_period_end: false,
        metadata,
      });
      return { mode: 'montee', formule: p.produit };
    }
    const planning = await s.stripe.subscriptionSchedules.create({ from_subscription: subId });
    const courante = planning.phases[0]!;
    await s.stripe.subscriptionSchedules.update(planning.id, {
      end_behavior: 'release',
      phases: [
        {
          items: [
            { price: element.price.id, quantity: 1 },
            ...(option ? [{ price: option.price.id, quantity: 1 }] : []),
          ],
          start_date: courante.start_date,
          end_date: courante.end_date,
        },
        {
          items: [
            { price: prixId, quantity: 1 },
            ...(garderOption ? [{ price: option!.price.id, quantity: 1 }] : []),
          ],
          proration_behavior: 'none',
          metadata,
        },
      ],
    });
    return { mode: 'descente', formule: p.produit };
  }

  const customer = await clientStripe(
    s,
    p.artisanId,
    p.email,
    (artisan.get('nomCommercial') as string | undefined) ?? '',
  );
  const code = p.code
    ? await lireCodeValable(s.db, {
        code: p.code,
        artisanId: p.artisanId,
        produit: p.produit,
        maintenant: s.horloge(),
      })
    : null;
  if (p.code && !code)
    throw new ErreurMetier(
      'PRECONDITION',
      'Ce code n’est plus valable. Le tarif normal s’applique.',
    );
  const metadata = {
    artisanId: p.artisanId,
    produit: p.produit,
    ...(code ? { codePromo: code.code } : {}),
  };
  const session = await creerSession(s, {
    mode: 'subscription',
    customer,
    client_reference_id: p.artisanId,
    line_items: [{ price: prixId, quantity: 1 }],
    metadata,
    subscription_data: { metadata },
    ...(code
      ? { discounts: [{ promotion_code: await codeStripe(s, code, customer) }] }
      : { allow_promotion_codes: true }),
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    billing_address_collection: 'required',
    customer_update: { address: 'auto', name: 'auto' },
    locale: 'fr',
    success_url: `${s.urlSite}/pro/abonnement/confirme?produit=${p.produit}`,
    cancel_url: `${s.urlSite}/pro/abonnement`,
  });
  if (!session.url) throw new ErreurMetier('INDISPONIBLE');
  return { mode: 'checkout', url: session.url };
}

/**
 * Option Blog 9,90 € HT/mois (D71) : ajoutée à l'abonnement en cours (Site Pro ou Fiche + Site),
 * prorata facturé tout de suite ; retirée sans remboursement du mois entamé. Aucune saisie de carte
 * chez nous : la carte de l'abonnement est utilisée. `droits.optionBlog` suit par le webhook.
 */
export async function changerOptionBlog(
  s: ServicesCheckout,
  p: { artisanId: string; activer: boolean },
): Promise<void> {
  const [artisan, prive] = await Promise.all([
    s.db.doc(chemins.artisan(p.artisanId)).get(),
    s.db.doc(chemins.facturationPrivee(p.artisanId)).get(),
  ]);
  if (!artisan.exists) throw new ErreurMetier('INTROUVABLE');
  const formule = (artisan.get('droits.formule') as Formule | undefined) ?? 'gratuit';
  const subId = prive.get('stripeSubscriptionId') as string | undefined;
  if (p.activer && (!optionBlogPossible(formule) || !subId))
    throw new ErreurMetier(
      'PRECONDITION',
      formule === 'tout_inclus'
        ? 'Tout inclus comprend déjà 15 articles par mois.'
        : 'L’option Blog s’ajoute à Site Pro ou Fiche + Site.',
    );
  if (!subId) return;
  const sub = await s.stripe.subscriptions.retrieve(subId);
  const option = sub.items.data.find((e) => lirePrix(e.price.lookup_key)?.type === 'option_blog');
  if (p.activer === Boolean(option)) return;
  await s.stripe.subscriptions.update(subId, {
    items: p.activer
      ? [{ price: await prixStripe(s, 'option_blog'), quantity: 1 }]
      : [{ id: option!.id ?? '', deleted: true }],
    proration_behavior: p.activer ? 'always_invoice' : 'none',
  });
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
    const pack = CATALOGUE_STRIPE.find((c) => c.produit === 'credits' && c.cle === p.cle);
    if (!pack?.credits) throw new ErreurMetier('ENTREE_INVALIDE', 'Pack inconnu.');
    ligne = { price: await prixStripe(s, pack.cle), quantity: 1 };
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
  const session = await creerSession(s, {
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
    return_url: `${s.urlSite}/pro/abonnement`,
  });
  return { url };
}
