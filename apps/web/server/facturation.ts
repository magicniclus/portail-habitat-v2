import 'server-only';
import { deuxFacteursRequisPourFacturation } from '@ph/core/connexion';
import { ErreurMetier } from '@ph/core/erreurs';
import { appAdmin } from '@ph/firebase/admin';
import { lireCodeValable } from '@ph/firebase/cycle';
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

/** CON-02 : propriétaire ou gérant Premium sans second facteur → facturation bloquée. */
export function facturationBloquee(s: SessionPro): boolean {
  return (
    s.plan !== null &&
    s.role !== null &&
    deuxFacteursRequisPourFacturation({
      plan: s.plan,
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
