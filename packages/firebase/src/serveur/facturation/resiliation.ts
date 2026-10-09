import {
  alternativeResiliation,
  type AlternativeResiliation,
  type RaisonResiliation,
} from '@ph/core/conversion';
import { ErreurMetier } from '@ph/core/erreurs';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { tracer } from '../cycle/moteur';
import type { ClientStripe } from './stripe';

/**
 * Parcours de résiliation (CONVERSION §3 S8) : raison obligatoire, une alternative adaptée
 * (descente en Visibilité, −50 % pendant 2 mois, suspension de 2 mois ou appel), puis la
 * résiliation en fin de période si l'artisan confirme. Toujours possible en un clic.
 */

export interface ServicesResiliation {
  db: Firestore;
  horloge: () => number;
  stripe: ClientStripe;
}

const J = 86_400_000;
const COUPON_RETENTION = 'ph_retention_50_2m';

export interface AbonnementResiliable {
  id: string;
  produit: 'premium' | 'visibilite';
  periode: 'mensuel' | 'annuel';
  finPeriode: number;
}

export async function lireResiliation(
  db: Firestore,
  artisanId: string,
): Promise<{ abonnements: AbonnementResiliable[]; derniereOffreRetention?: number }> {
  const [abos, etat] = await Promise.all([
    db.collection(collections.abonnements).where('artisanId', '==', artisanId).get(),
    db.collection(collections.cycleEtat).doc(artisanId).get(),
  ]);
  const derniere = (etat.get('derniereOffreRetention') as Timestamp | null | undefined)?.toMillis();
  return {
    abonnements: abos.docs
      .filter((a) => a.get('statut') === 'active' && a.get('annulationFinPeriode') !== true)
      .map((a) => ({
        id: a.id,
        produit: a.get('produit') as 'premium' | 'visibilite',
        periode: a.get('periode') as 'mensuel' | 'annuel',
        finPeriode: (a.get('finPeriode') as Timestamp).toMillis(),
      })),
    ...(derniere !== undefined ? { derniereOffreRetention: derniere } : {}),
  };
}

async function abonnementDe(s: ServicesResiliation, artisanId: string, id: string) {
  const r = await lireResiliation(s.db, artisanId);
  const a = r.abonnements.find((x) => x.id === id);
  if (!a) throw new ErreurMetier('INTROUVABLE', 'Cet abonnement n’est plus actif.');
  return { abonnement: a, derniereOffreRetention: r.derniereOffreRetention };
}

/** Alternative proposée pour cette raison (calculée côté serveur, jamais par le navigateur). */
export async function proposerAlternative(
  s: ServicesResiliation,
  e: { artisanId: string; abonnementId: string; raison: RaisonResiliation },
): Promise<AlternativeResiliation> {
  const { abonnement, derniereOffreRetention } = await abonnementDe(s, e.artisanId, e.abonnementId);
  return alternativeResiliation(e.raison, {
    produit: abonnement.produit,
    maintenant: s.horloge(),
    ...(derniereOffreRetention !== undefined ? { derniereOffreRetention } : {}),
  });
}

/** L'artisan accepte l'alternative : remise ou suspension chez Stripe, ou tâche d'appel. */
export async function accepterAlternative(
  s: ServicesResiliation,
  e: { artisanId: string; abonnementId: string; raison: RaisonResiliation },
): Promise<AlternativeResiliation> {
  const alternative = await proposerAlternative(s, e);
  const maintenant = s.horloge();
  const t0 = Timestamp.fromMillis(maintenant);
  if (alternative.type === 'remise') {
    try {
      await s.stripe.coupons.create({
        id: COUPON_RETENTION,
        percent_off: 50,
        duration: 'repeating',
        duration_in_months: 2,
        name: 'Rétention −50 % pendant 2 mois',
      });
    } catch (err) {
      if ((err as { code?: string }).code !== 'resource_already_exists') throw err;
    }
    await s.stripe.subscriptions.update(e.abonnementId, {
      discounts: [{ coupon: COUPON_RETENTION }],
    });
  } else if (alternative.type === 'suspendre') {
    await s.stripe.subscriptions.update(e.abonnementId, {
      pause_collection: {
        behavior: 'void',
        resumes_at: Math.floor((maintenant + 60 * J) / 1000),
      },
    });
  } else if (alternative.type === 'appel') {
    await s.db.collection(collections.filesModeration).add({
      schemaVersion: 1,
      type: 'risque_resiliation',
      refs: { artisanId: e.artisanId },
      priorite: 4,
      statut: 'a_traiter',
      permissionRequise: 'conversion.piloter',
      createdAt: t0,
      updatedAt: t0,
    });
  }
  if (alternative.type === 'remise' || alternative.type === 'suspendre')
    await s.db
      .collection(collections.cycleEtat)
      .doc(e.artisanId)
      .set({ derniereOffreRetention: t0 }, { merge: true });
  await tracer(s.db, maintenant, {
    artisanId: e.artisanId,
    type: 'retention',
    fonction: 'parcoursResiliation',
    details: { raison: e.raison, alternative: alternative.type },
  });
  return alternative;
}

/** Résiliation confirmée : fin de période chez Stripe ; le webhook met le miroir à jour. */
export async function confirmerResiliation(
  s: ServicesResiliation,
  e: { artisanId: string; abonnementId: string; raison: RaisonResiliation },
): Promise<{ finPeriode: number }> {
  const { abonnement } = await abonnementDe(s, e.artisanId, e.abonnementId);
  await s.stripe.subscriptions.update(e.abonnementId, {
    cancel_at_period_end: true,
    metadata: { raisonResiliation: e.raison },
  });
  await tracer(s.db, s.horloge(), {
    artisanId: e.artisanId,
    type: 'resiliation_demandee',
    fonction: 'parcoursResiliation',
    details: { raison: e.raison, produit: abonnement.produit },
  });
  return { finPeriode: abonnement.finPeriode };
}
