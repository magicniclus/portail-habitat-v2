import {
  effetAbonnements,
  lirePrix,
  type AbonnementEtat,
  type StatutAbonnement,
} from '@ph/core/facturation';
import { ErreurMetier } from '@ph/core/erreurs';
import { formatDate } from '@ph/core/format';
import { FieldValue, Timestamp, type Transaction } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { appliquerSieges } from '../comptes/membres';
import { marquerCodeUtilise } from '../cycle/codes';
import { synchroniserArtisan } from '../cycle/moteur';
import { attribuerDemandeOfferte } from '../cycle/offertes';
import type { ServicesComptes } from '../comptes/services';
import { debloquerAppelOffres } from '../matching/deblocage';
import type {
  AbonnementStripe,
  EvenementStripe,
  FactureStripe,
  SessionCheckoutStripe,
} from './stripe';

/**
 * Webhook Stripe (INTEGRATIONS §1) : seul endroit qui écrit `plan`, `optionVisibilite` et
 * `siegesMax`. Chaque événement n'a qu'un effet (`stripeEvents/{id}`, PAY-02) ; les miroirs et
 * l'entreprise sont écrits dans une transaction, les emails partent ensuite.
 */

export type ServicesFacturation = ServicesComptes;
type Suite = () => Promise<unknown>;

/** Crédits inclus chaque mois en Premium (D27, proposition appliquée en attendant). */
export const CREDITS_INCLUS_PREMIUM = 5;
const LIEN_FACTURATION = '/pro/facturation';

const ts = (secondes: number) => Timestamp.fromMillis(secondes * 1000);
const jour = (secondes: number) => formatDate(secondes * 1000, 'long');

/** Entreprise concernée : métadonnées posées par notre Checkout, sinon miroir déjà connu. */
async function artisanDe(
  s: ServicesFacturation,
  t: Transaction,
  metadata: Record<string, string> | undefined,
  subscriptionId: string | null | undefined,
): Promise<string> {
  if (metadata?.artisanId) return metadata.artisanId;
  if (subscriptionId) {
    const abo = await t.get(s.db.collection(collections.abonnements).doc(subscriptionId));
    if (abo.exists) return abo.get('artisanId') as string;
  }
  // Stripe renverra l'événement plus tard : l'abonnement sera connu entre-temps.
  throw new Error('Entreprise introuvable pour cet événement Stripe');
}

async function destinataire(s: ServicesFacturation, t: Transaction, artisanId: string) {
  const a = await t.get(s.db.doc(chemins.artisan(artisanId)));
  const uid = a.get('proprietaireUid') as string | undefined;
  return { uid, nomCommercial: (a.get('nomCommercial') as string | undefined) ?? '' };
}

function lireAbonnement(sub: AbonnementStripe, supprime: boolean) {
  let produit: AbonnementEtat['produit'] | null = null;
  let periode: 'mensuel' | 'annuel' = 'mensuel';
  let priceId = '';
  let sieges = 0;
  let debut = sub.current_period_start ?? 0;
  let fin = sub.current_period_end ?? 0;
  for (const el of sub.items.data) {
    const p = lirePrix(el.price.lookup_key);
    if (p?.type === 'abonnement') {
      produit = p.produit;
      periode = p.periode;
      priceId = el.price.id;
      debut = el.current_period_start ?? debut;
      fin = el.current_period_end ?? fin;
    } else if (p?.type === 'siege') sieges = el.quantity ?? 0;
  }
  if (!produit) return null;
  return {
    produit,
    periode,
    priceId,
    sieges,
    statut: (supprime ? 'canceled' : sub.status) as StatutAbonnement,
    debut,
    fin,
  };
}

/** `customer.subscription.*` : miroir, puis effet recalculé sur toute l'entreprise. */
async function abonnementModifie(
  s: ServicesFacturation,
  t: Transaction,
  ev: EvenementStripe,
  suites: Suite[],
): Promise<boolean> {
  const sub = ev.data.object as AbonnementStripe;
  const lu = lireAbonnement(sub, ev.type === 'customer.subscription.deleted');
  if (!lu) return false;
  const artisanId = await artisanDe(s, t, sub.metadata, sub.id);
  const ref = s.db.collection(collections.abonnements).doc(sub.id);
  const refArtisan = s.db.doc(chemins.artisan(artisanId));
  const [avant, autres, artisan] = await Promise.all([
    t.get(ref),
    t.get(s.db.collection(collections.abonnements).where('artisanId', '==', artisanId)),
    t.get(refArtisan),
  ]);
  // Événements dans le désordre : un état plus ancien n'écrase pas un état plus récent.
  if (avant.exists && ((avant.get('evenementLe') as number | undefined) ?? 0) > ev.created)
    return false;
  const maintenant = s.horloge();
  t.set(ref, {
    schemaVersion: 1,
    artisanId,
    produit: lu.produit,
    priceId: lu.priceId,
    periode: lu.periode,
    statut: lu.statut,
    debutPeriode: ts(lu.debut),
    finPeriode: ts(lu.fin),
    annulationFinPeriode: sub.cancel_at_period_end,
    ...(sub.canceled_at ? { annuleLe: ts(sub.canceled_at) } : {}),
    ...(sub.discount?.promotion_code ? { codePromo: sub.discount.promotion_code } : {}),
    sieges: lu.sieges,
    evenementLe: ev.created,
    createdAt: avant.exists ? avant.get('createdAt') : Timestamp.fromMillis(maintenant),
    updatedAt: Timestamp.fromMillis(maintenant),
  });
  const etats: AbonnementEtat[] = autres.docs
    .filter((d) => d.id !== sub.id)
    .map((d) => ({
      produit: d.get('produit'),
      statut: d.get('statut'),
      debutPeriode: (d.get('debutPeriode') as Timestamp).toMillis(),
      finPeriode: (d.get('finPeriode') as Timestamp).toMillis(),
      sieges: (d.get('sieges') as number | undefined) ?? 0,
    }));
  etats.push({
    produit: lu.produit,
    statut: lu.statut,
    debutPeriode: lu.debut * 1000,
    finPeriode: lu.fin * 1000,
    sieges: lu.sieges,
  });
  const e = effetAbonnements(etats, maintenant);
  t.update(refArtisan, {
    plan: e.plan,
    planExpireLe: e.planExpireLe ? Timestamp.fromMillis(e.planExpireLe) : FieldValue.delete(),
    ...(e.plan === 'gratuit'
      ? { planPeriode: FieldValue.delete() }
      : lu.produit === 'premium'
        ? { planPeriode: lu.periode }
        : {}),
    optionVisibilite: e.optionVisibilite,
    optionVisibiliteExpireLe: e.optionVisibiliteExpireLe
      ? Timestamp.fromMillis(e.optionVisibiliteExpireLe)
      : FieldValue.delete(),
    siegesMax: e.siegesMax,
    updatedAt: Timestamp.fromMillis(maintenant),
  });
  if (artisan.get('siegesMax') !== e.siegesMax)
    suites.push(() => appliquerSieges(s, artisanId, e.siegesMax));

  // Moteur de conversion : code personnel utilisé, étape recalculée sans attendre la nuit.
  const code = sub.metadata.codePromo;
  if (code && (lu.statut === 'active' || lu.statut === 'trialing'))
    suites.push(() => marquerCodeUtilise(s.db, s.horloge(), { code, artisanId }));
  suites.push(async () => {
    await synchroniserArtisan(s, artisanId);
    if (lu.statut === 'active' || lu.statut === 'trialing')
      await attribuerDemandeOfferte(s, artisanId);
  });

  const avantResiliation = ev.data.previous_attributes?.cancel_at_period_end;
  const modele =
    ev.type === 'customer.subscription.created' &&
    (lu.statut === 'active' || lu.statut === 'trialing')
      ? 'abonnement-active'
      : ev.type === 'customer.subscription.deleted'
        ? 'abonnement-termine'
        : avantResiliation === false && sub.cancel_at_period_end
          ? 'abonnement-resilie'
          : null;
  const uid = artisan.get('proprietaireUid') as string | undefined;
  const nomCommercial = (artisan.get('nomCommercial') as string | undefined) ?? '';
  if (modele && uid)
    suites.push(() =>
      s.notifier({
        modele,
        destinataire: { uid, artisanId },
        refObjet: `abonnements/${sub.id}`,
        variante: ev.id,
        donnees: {
          nomCommercial,
          produit: lu.produit,
          periode: lu.periode,
          finPeriode: jour(lu.fin),
          lien: modele === 'abonnement-termine' ? '/pro/abonnement/premium' : LIEN_FACTURATION,
        },
      }),
    );
  return true;
}

const subscriptionDe = (f: FactureStripe) =>
  f.parent?.subscription_details?.subscription ?? f.subscription ?? null;

/** `invoice.paid` / `invoice.payment_failed` : miroir de la facture, reçu ou relance, crédits inclus. */
async function factureModifiee(
  s: ServicesFacturation,
  t: Transaction,
  ev: EvenementStripe,
  suites: Suite[],
): Promise<boolean> {
  const f = ev.data.object as FactureStripe;
  if (!f.id) return false;
  const subId = subscriptionDe(f);
  if (!subId) return false;
  const artisanId = await artisanDe(s, t, f.parent?.subscription_details?.metadata, subId);
  const [abo, dest, portefeuille] = await Promise.all([
    t.get(s.db.collection(collections.abonnements).doc(subId)),
    destinataire(s, t, artisanId),
    t.get(s.db.doc(chemins.portefeuille(artisanId))),
  ]);
  const paye = ev.type === 'invoice.paid';
  const ht = f.total_excluding_tax ?? f.subtotal;
  const periode = f.lines?.data[0]?.period ?? { start: f.period_start, end: f.period_end };
  t.set(s.db.collection(collections.factures).doc(f.id), {
    schemaVersion: 1,
    artisanId,
    numero: f.number ?? f.id,
    montantHtCentimes: ht,
    tvaCentimes: f.total - ht,
    montantTtcCentimes: f.total,
    devise: 'eur',
    statut: f.status ?? (paye ? 'paid' : 'open'),
    ...(f.invoice_pdf ? { pdfUrl: f.invoice_pdf } : {}),
    ...(f.hosted_invoice_url ? { hostedUrl: f.hosted_invoice_url } : {}),
    periodeDebut: ts(periode.start),
    periodeFin: ts(periode.end),
    ...(paye && f.status_transitions?.paid_at ? { payeeLe: ts(f.status_transitions.paid_at) } : {}),
    createdAt: Timestamp.fromMillis(s.horloge()),
  });
  if (f.payment_intent)
    t.set(s.db.collection(collections.paiements).doc(f.payment_intent), {
      schemaVersion: 1,
      artisanId,
      montantCentimes: f.total,
      statut: paye ? 'succeeded' : 'failed',
      createdAt: Timestamp.fromMillis(s.horloge()),
    });
  // Premium payé : crédits inclus du mois remis à neuf (non reportables, D27).
  if (paye && abo.get('produit') === 'premium')
    t.set(
      portefeuille.ref,
      {
        schemaVersion: 1,
        soldeCredits: (portefeuille.get('soldeCredits') as number | undefined) ?? 0,
        creditsInclusMois: CREDITS_INCLUS_PREMIUM,
        creditsInclusRestants: CREDITS_INCLUS_PREMIUM,
        renouvelleLe: ts(periode.end),
        updatedAt: Timestamp.fromMillis(s.horloge()),
      },
      { merge: true },
    );
  if (dest.uid && f.total > 0)
    suites.push(() =>
      s.notifier({
        modele: paye ? 'recu' : 'paiement-echoue',
        destinataire: { uid: dest.uid, artisanId },
        refObjet: `factures/${f.id}`,
        variante: ev.id,
        donnees: {
          nomCommercial: dest.nomCommercial,
          numero: f.number ?? f.id,
          montantTtcCentimes: f.total,
          lien: LIEN_FACTURATION,
          ...(f.hosted_invoice_url ? { lienFacture: f.hosted_invoice_url } : {}),
        },
      }),
    );
  return true;
}

/** `invoice.upcoming` : information obligatoire avant la reconduction d'un abonnement annuel. */
async function renouvellementProche(
  s: ServicesFacturation,
  t: Transaction,
  ev: EvenementStripe,
  suites: Suite[],
): Promise<boolean> {
  const f = ev.data.object as FactureStripe;
  const subId = subscriptionDe(f);
  if (!subId) return false;
  const abo = await t.get(s.db.collection(collections.abonnements).doc(subId));
  if (!abo.exists || abo.get('periode') !== 'annuel') return false;
  const artisanId = abo.get('artisanId') as string;
  const dest = await destinataire(s, t, artisanId);
  if (dest.uid)
    suites.push(() =>
      s.notifier({
        modele: 'renouvellement',
        destinataire: { uid: dest.uid, artisanId },
        refObjet: `abonnements/${subId}`,
        variante: ev.id,
        donnees: {
          nomCommercial: dest.nomCommercial,
          produit: abo.get('produit'),
          periode: 'annuel',
          finPeriode: formatDate((abo.get('finPeriode') as Timestamp).toMillis(), 'long'),
          montantTtcCentimes: f.total,
          lien: LIEN_FACTURATION,
        },
      }),
    );
  return true;
}

/**
 * Déblocage payé par carte (MATCHING [8]) : finalisé après la transaction du webhook (le déblocage
 * a la sienne). Plus de place ou plus autorisé entre-temps : tâche de remboursement pour l'équipe.
 * Erreur inattendue : l'événement est noté en échec pour que Stripe le renvoie (déblocage idempotent).
 */
function finaliserLead(
  s: ServicesFacturation,
  ev: EvenementStripe,
  c: SessionCheckoutStripe,
  artisanId: string,
): Suite {
  const { appelOffresId, uid } = c.metadata;
  return async () => {
    try {
      await debloquerAppelOffres(s, {
        appelOffresId: appelOffresId!,
        artisanId,
        uid: uid!,
        choix: 'carte',
        paiementCarte: {
          sessionId: c.id,
          centimes: Number(c.metadata.centimes),
          ...(c.payment_intent ? { paymentIntentId: c.payment_intent } : {}),
        },
      });
    } catch (e) {
      if (!(e instanceof ErreurMetier)) {
        await s.db
          .collection(collections.stripeEvents)
          .doc(ev.id)
          .set(
            { ok: false, erreur: String((e as Error).message ?? e).slice(0, 500) },
            { merge: true },
          );
        throw e;
      }
      await s.db
        .collection(collections.filesModeration)
        .doc(`remboursement-${c.id}`)
        .set({
          schemaVersion: 1,
          type: 'remboursement_carte_lead',
          refs: {
            artisanId,
            appelOffresId: appelOffresId!,
            sessionId: c.id,
            ...(c.payment_intent ? { paymentIntentId: c.payment_intent } : {}),
            motif: e.message,
          },
          priorite: 4,
          statut: 'a_traiter',
          permissionRequise: 'finances.rembourser_carte',
          createdAt: Timestamp.fromMillis(s.horloge()),
        });
    }
  };
}

/** `checkout.session.completed` : client Stripe lié à l'entreprise ; pack crédité ; lead débloqué. */
async function checkoutTermine(
  s: ServicesFacturation,
  t: Transaction,
  ev: EvenementStripe,
  suites: Suite[],
): Promise<boolean> {
  const c = ev.data.object as SessionCheckoutStripe;
  const artisanId = c.client_reference_id ?? c.metadata.artisanId;
  if (!artisanId) return false;
  const credits = Number(c.metadata.credits ?? 0);
  const pack = c.mode === 'payment' && c.metadata.type === 'pack' && credits > 0;
  const [dest, portefeuille] = await Promise.all([
    pack ? destinataire(s, t, artisanId) : null,
    pack ? t.get(s.db.doc(chemins.portefeuille(artisanId))) : null,
  ]);
  if (c.customer)
    t.set(
      s.db.doc(chemins.facturationPrivee(artisanId)),
      {
        stripeCustomerId: c.customer,
        ...(c.subscription
          ? {
              [c.metadata.produit === 'visibilite'
                ? 'stripeVisibiliteSubscriptionId'
                : 'stripeSubscriptionId']: c.subscription,
            }
          : {}),
      },
      { merge: true },
    );
  const paye = !c.payment_status || c.payment_status === 'paid';
  if (c.mode === 'payment' && c.metadata.type === 'lead' && c.metadata.appelOffresId) {
    if (paye) suites.push(finaliserLead(s, ev, c, artisanId));
    return true;
  }
  if (!pack || !portefeuille || !paye) return true;
  const solde = ((portefeuille.get('soldeCredits') as number | undefined) ?? 0) + credits;
  const maintenant = Timestamp.fromMillis(s.horloge());
  t.set(
    portefeuille.ref,
    {
      schemaVersion: 1,
      soldeCredits: solde,
      creditsInclusMois: (portefeuille.get('creditsInclusMois') as number | undefined) ?? 0,
      creditsInclusRestants: (portefeuille.get('creditsInclusRestants') as number | undefined) ?? 0,
      updatedAt: maintenant,
    },
    { merge: true },
  );
  t.set(s.db.collection(chemins.mouvements(artisanId)).doc(ev.id), {
    schemaVersion: 1,
    type: 'achat_pack',
    credits,
    soldeApres: solde,
    refId: c.id,
    par: 'stripe',
    createdAt: maintenant,
  });
  if (dest?.uid)
    suites.push(() =>
      s.notifier({
        modele: 'pack-achete',
        destinataire: { uid: dest.uid, artisanId },
        refObjet: `checkout/${c.id}`,
        variante: ev.id,
        donnees: {
          nomCommercial: dest.nomCommercial,
          credits,
          soldeCredits: solde,
          lien: LIEN_FACTURATION,
        },
      }),
    );
  return true;
}

const GESTIONNAIRES: Record<
  string,
  (s: ServicesFacturation, t: Transaction, ev: EvenementStripe, suites: Suite[]) => Promise<boolean>
> = {
  'checkout.session.completed': checkoutTermine,
  'customer.subscription.created': abonnementModifie,
  'customer.subscription.updated': abonnementModifie,
  'customer.subscription.deleted': abonnementModifie,
  'invoice.paid': factureModifiee,
  'invoice.payment_failed': factureModifiee,
  'invoice.upcoming': renouvellementProche,
};

export type ResultatWebhook = 'traite' | 'deja_traite' | 'ignore';

/**
 * Traite un événement déjà authentifié (signature vérifiée par l'appelant). Un échec est noté
 * (`ok: false`) et relancé : Stripe renverra l'événement, qui sera alors retraité.
 */
export async function traiterEvenementStripe(
  s: ServicesFacturation,
  ev: EvenementStripe,
): Promise<ResultatWebhook> {
  const ref = s.db.collection(collections.stripeEvents).doc(ev.id);
  const gerer = GESTIONNAIRES[ev.type];
  const suites: Suite[] = [];
  let resultat: ResultatWebhook;
  try {
    resultat = await s.db.runTransaction(async (t) => {
      suites.length = 0;
      const deja = await t.get(ref);
      if (deja.exists && deja.get('ok') === true) return 'deja_traite';
      const traite = gerer ? await gerer(s, t, ev, suites) : false;
      t.set(ref, {
        schemaVersion: 1,
        type: ev.type,
        traiteLe: Timestamp.fromMillis(s.horloge()),
        ok: true,
      });
      return traite ? 'traite' : 'ignore';
    });
  } catch (e) {
    await ref.set({
      schemaVersion: 1,
      type: ev.type,
      traiteLe: Timestamp.fromMillis(s.horloge()),
      ok: false,
      erreur: String((e as Error).message ?? e).slice(0, 500),
    });
    throw e;
  }
  for (const suite of suites) await suite();
  return resultat;
}
