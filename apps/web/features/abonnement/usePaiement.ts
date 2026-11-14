'use client';

import type { FormulePayante } from '@ph/core/paiements';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

type Reponse =
  { mode: 'checkout'; url: string } | { mode: 'montee' | 'descente'; formule: FormulePayante };

/**
 * « Continuer vers le paiement » : Stripe Checkout pour un premier abonnement (aucune carte saisie
 * chez nous, règle 7) ; sinon Stripe change la formule et la page de confirmation attend le webhook.
 */
export function usePaiement(formule: FormulePayante, code?: string) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const payer = async () => {
    setEnCours(true);
    setErreur(null);
    const res = await posterJson<Reponse>('/api/pro/abonnement/checkout', {
      produit: formule,
      ...(code ? { code } : {}),
    });
    if (!res.ok) {
      setEnCours(false);
      return setErreur(res.message);
    }
    if (res.data.mode === 'checkout') return window.location.assign(res.data.url);
    router.push(`/pro/abonnement/confirme?produit=${formule}&mode=${res.data.mode}`);
  };
  return { payer, enCours, erreur };
}
