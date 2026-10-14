import { niveauConversion } from '@ph/core/paiements';
import 'server-only';
import { deuxFacteursRequisPourFacturation } from '@ph/core/connexion';
import { ErreurMetier } from '@ph/core/erreurs';
import { appAdmin } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import { lireCodeValable } from '@ph/firebase/cycle';
import { lireFacturation } from '@ph/firebase/facturation';
import type { ServicesCheckout } from '@ph/firebase/facturation';
import { getFirestore } from 'firebase-admin/firestore';
import { URL_SITE } from '@/features/vitrine/seo';
import type { SessionPro } from './sessionPro';
import { clientStripe } from './stripe';

/** Checkout et portail : indisponibles tant que la clé Stripe n'est pas configurée. */
export function servicesCheckout(): ServicesCheckout {
  const stripe = clientStripe();
  if (!stripe)
    throw new ErreurMetier('INDISPONIBLE', 'Les paiements en ligne ne sont pas encore ouverts.');
  return { db: getFirestore(appAdmin()), stripe, urlSite: URL_SITE, horloge: Date.now };
}

/** CON-02 : propriétaire ou gérant Tout inclus (ex-Premium) sans second facteur → facturation bloquée. */
export function facturationBloquee(s: SessionPro): boolean {
  return (
    s.formule !== null &&
    s.role !== null &&
    deuxFacteursRequisPourFacturation({
      plan: niveauConversion(s.formule),
      role: s.role,
      secondFacteur: s.secondFacteur,
    })
  );
}

/** Code personnel reçu par email (`?code=`) : remise affichée avant le paiement, ou rien. */
export async function remiseConversion(
  code: string | undefined,
  artisanId: string,
  produit: string,
): Promise<{ code: string; pourcentage: number; expireLe: number } | 'invalide' | null> {
  if (!code) return null;
  const c = await lireCodeValable(getFirestore(appAdmin()), {
    code: code.toUpperCase(),
    artisanId,
    produit,
    maintenant: Date.now(),
  });
  return c ? { code: c.code, pourcentage: c.pourcentage, expireLe: c.expireLe } : 'invalide';
}

/** Page Mon abonnement : abonnements, factures, solde de crédits et carte enregistrée. */
export async function lireMonAbonnement(artisanId: string) {
  const db = getFirestore(appAdmin());
  const [f, portefeuille, prive] = await Promise.all([
    lireFacturation(db, artisanId),
    db.doc(chemins.portefeuille(artisanId)).get(),
    db.doc(chemins.facturationPrivee(artisanId)).get(),
  ]);
  const last4 = prive.get('defaultPaymentMethodLast4') as string | undefined;
  return {
    ...f,
    soldeCredits: (portefeuille.get('soldeCredits') as number | undefined) ?? 0,
    carte: last4
      ? { last4, marque: (prive.get('defaultPaymentMethodBrand') as string | undefined) ?? '' }
      : null,
    emailFacturation: (prive.get('emailFacturation') as string | undefined) ?? null,
  };
}
