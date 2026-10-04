import { codePersonnel, type CodeActif } from '@ph/core/conversion';
import { ErreurMetier } from '@ph/core/erreurs';
import { randomInt } from 'node:crypto';
import { Timestamp, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import type { ClientStripe } from '../facturation/stripe';
import { tracer } from './moteur';

/**
 * Codes promo personnels (CONVERSION §6) : réservés dans `codesPromo/{code}` à l'envoi de l'email,
 * créés chez Stripe au premier clic (usage unique, client et date de fin fixés), puis marqués
 * utilisés par le webhook. Un code jamais cliqué ne crée donc rien chez Stripe.
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const alea = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
const couponId = (pourcentage: number, mois: number) => `ph_conv_${pourcentage}_${mois}m`;

/** Réserve un code pour l'entreprise ; `cycleEtat` garde le code actif et la date de la remise. */
export async function reserverCode(
  db: Firestore,
  maintenant: number,
  e: {
    artisanId: string;
    nom: string;
    modele: string;
    pourcentage: number;
    dureeMois: number;
    produit: 'visibilite' | 'premium';
    expire: number;
  },
): Promise<string> {
  for (let essai = 0; essai < 5; essai++) {
    const code = codePersonnel(e.nom, e.pourcentage, alea());
    const ref = db.collection(collections.codesPromo).doc(code);
    const t0 = Timestamp.fromMillis(maintenant);
    const cree = await db.runTransaction(async (t) => {
      if ((await t.get(ref)).exists) return false;
      t.create(ref, {
        schemaVersion: 1,
        couponId: couponId(e.pourcentage, e.dureeMois),
        pourcentage: e.pourcentage,
        duree: 'repeating',
        dureeMois: e.dureeMois,
        produits: [e.produit],
        actif: true,
        utilisations: 0,
        maxUtilisations: 1,
        expireLe: Timestamp.fromMillis(e.expire),
        source: 'conversion',
        artisanId: e.artisanId,
        modele: e.modele,
        creePar: 'cyclePlanifier',
        createdAt: t0,
        updatedAt: t0,
      });
      t.set(
        db.collection(collections.cycleEtat).doc(e.artisanId),
        {
          derniereRemise: t0,
          codeActif: {
            code,
            pourcentage: e.pourcentage,
            produit: e.produit,
            expire: Timestamp.fromMillis(e.expire),
            utilise: false,
          },
        },
        { merge: true },
      );
      return true;
    });
    if (cree) {
      await tracer(db, maintenant, {
        artisanId: e.artisanId,
        type: 'code_cree',
        fonction: 'cyclePlanifier',
        modele: e.modele,
        details: { code, pourcentage: e.pourcentage, expire: new Date(e.expire).toISOString() },
      });
      return code;
    }
  }
  throw new Error('Code promo : 5 collisions de suite');
}

/** Code actif de `cycleEtat`, en millisecondes. */
export function lireCodeActif(etat: DocumentSnapshot): CodeActif | undefined {
  const c = etat.get('codeActif') as
    (Omit<CodeActif, 'expire'> & { expire: Timestamp }) | undefined;
  return c ? { ...c, expire: c.expire.toMillis() } : undefined;
}

export interface CodeValable {
  code: string;
  pourcentage: number;
  dureeMois: number;
  expireLe: number;
  stripePromotionCodeId?: string;
  couponId: string;
}

/** Le code est-il utilisable par cette entreprise, pour ce produit, maintenant ? */
export async function lireCodeValable(
  db: Firestore,
  e: { code: string; artisanId: string; produit: string; maintenant: number },
): Promise<CodeValable | null> {
  if (!/^[A-Z0-9]{4,24}$/.test(e.code)) return null;
  const d = await db.collection(collections.codesPromo).doc(e.code).get();
  if (
    !d.exists ||
    d.get('source') !== 'conversion' ||
    d.get('artisanId') !== e.artisanId ||
    d.get('actif') !== true ||
    !(d.get('produits') as string[]).includes(e.produit) ||
    (d.get('utilisations') as number) >= ((d.get('maxUtilisations') as number | undefined) ?? 1) ||
    (d.get('expireLe') as Timestamp).toMillis() <= e.maintenant
  )
    return null;
  return {
    code: d.id,
    pourcentage: d.get('pourcentage') as number,
    dureeMois: d.get('dureeMois') as number,
    expireLe: (d.get('expireLe') as Timestamp).toMillis(),
    couponId: d.get('couponId') as string,
    ...(d.get('stripePromotionCodeId')
      ? { stripePromotionCodeId: d.get('stripePromotionCodeId') as string }
      : {}),
  };
}

/** Code Stripe à usage unique, réservé au client, expirant à la date affichée (créé une fois). */
export async function codeStripe(
  s: { db: Firestore; stripe: ClientStripe },
  c: CodeValable,
  customer: string,
): Promise<string> {
  if (c.stripePromotionCodeId) return c.stripePromotionCodeId;
  try {
    await s.stripe.coupons.create({
      id: c.couponId,
      percent_off: c.pourcentage,
      duration: 'repeating',
      duration_in_months: c.dureeMois,
      name: `Offre personnelle −${c.pourcentage} %`,
    });
  } catch (err) {
    if ((err as { code?: string }).code !== 'resource_already_exists') throw err;
  }
  const promo = await s.stripe.promotionCodes.create({
    promotion: { type: 'coupon', coupon: c.couponId },
    code: c.code,
    customer,
    max_redemptions: 1,
    expires_at: Math.floor(c.expireLe / 1000),
    metadata: { source: 'conversion' },
  });
  await s.db
    .collection(collections.codesPromo)
    .doc(c.code)
    .update({ stripePromotionCodeId: promo.id, updatedAt: Timestamp.now() });
  return promo.id;
}

/** Webhook : abonnement payé avec le code (métadonnée `codePromo`) ; sans effet la 2e fois. */
export async function marquerCodeUtilise(
  db: Firestore,
  maintenant: number,
  e: { code: string; artisanId: string },
): Promise<boolean> {
  const ref = db.collection(collections.codesPromo).doc(e.code);
  const refEtat = db.collection(collections.cycleEtat).doc(e.artisanId);
  const utilise = await db.runTransaction(async (t) => {
    const [d, etat] = await Promise.all([t.get(ref), t.get(refEtat)]);
    if (!d.exists || d.get('artisanId') !== e.artisanId) throw new ErreurMetier('INTROUVABLE');
    if ((d.get('utilisations') as number) >= ((d.get('maxUtilisations') as number) ?? 1))
      return false;
    t.update(ref, {
      utilisations: (d.get('utilisations') as number) + 1,
      actif: false,
      updatedAt: Timestamp.fromMillis(maintenant),
    });
    if (etat.get('codeActif.code') === e.code) t.update(refEtat, { 'codeActif.utilise': true });
    return true;
  });
  if (utilise)
    await tracer(db, maintenant, {
      artisanId: e.artisanId,
      type: 'code_utilise',
      fonction: 'webhookStripe',
      details: { code: e.code },
    });
  return utilise;
}

/** `cycleCodesExpires` (chaque heure) : codes passés désactivés (Stripe les expire de lui-même). */
export async function expirerCodes(db: Firestore, maintenant: number): Promise<number> {
  const r = await db
    .collection(collections.codesPromo)
    .where('actif', '==', true)
    .where('expireLe', '<=', Timestamp.fromMillis(maintenant))
    .limit(500)
    .get();
  const codes = r.docs.filter((d) => d.get('source') === 'conversion');
  for (const d of codes) {
    await d.ref.update({ actif: false, updatedAt: Timestamp.fromMillis(maintenant) });
    await tracer(db, maintenant, {
      artisanId: d.get('artisanId') as string,
      type: 'code_expire',
      fonction: 'cycleCodesExpires',
      details: { code: d.id },
    });
  }
  return codes.length;
}
