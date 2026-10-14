'use client';

import { NOMS_FORMULE, type FormulePayante } from '@ph/core/paiements';
import { Banner, bouton } from '@ph/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';

const INTERVALLE_MS = 2000;
const ESSAIS_MAX = 45;

/**
 * Retour de Stripe Checkout (PAY-01) : l'offre n'est affichée active qu'une fois confirmée par le
 * webhook (jamais sur la foi de l'URL). Interrogation toutes les 2 s pendant 90 s.
 */
export function AttenteConfirmation({
  produit,
  zone,
  descente = false,
}: {
  produit: FormulePayante;
  zone: string;
  /** Descente de formule : effective à l'échéance, rien à attendre maintenant (PAY-04). */
  descente?: boolean;
}) {
  const [etat, setEtat] = useState<'attente' | 'confirme' | 'long'>('attente');
  useEffect(() => {
    if (descente) return;
    let essais = 0;
    let fini = false;
    const verifier = async () => {
      const r = await posterJson<{ actif: boolean }>('/api/pro/abonnement/etat', { produit });
      if (fini) return;
      if (r.ok && r.data.actif) return setEtat('confirme');
      if (++essais >= ESSAIS_MAX) return setEtat('long');
      setTimeout(verifier, INTERVALLE_MS);
    };
    void verifier();
    return () => {
      fini = true;
    };
  }, [produit, descente]);

  if (descente)
    return (
      <div className="grid gap-4" role="status">
        <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">Changement enregistré</h1>
        <p className="m-0 text-base text-neutre-800">
          Vous passerez à {NOMS_FORMULE[produit]} à votre prochaine échéance. D&apos;ici là, votre
          formule actuelle reste active.
        </p>
        <Link href={routes.proAbonnement} className={bouton()}>
          Retour à mon abonnement
        </Link>
      </div>
    );
  if (etat === 'confirme')
    return (
      <div className="grid gap-4" role="status">
        <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">Paiement confirmé</h1>
        <p className="m-0 text-base text-neutre-800">
          {`${NOMS_FORMULE[produit]} est actif${zone ? ` sur ${zone}` : ''}.`} Un reçu vient de
          partir par email.
        </p>
        <Link href={routes.proTableauDeBord} className={bouton()}>
          Retour à mon espace
        </Link>
      </div>
    );
  return (
    <div className="grid gap-4" role="status" aria-live="polite">
      <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">Confirmation du paiement…</h1>
      {etat === 'long' ? (
        <Banner tone="info">
          La confirmation de Stripe prend plus de temps que prévu. Votre offre s&apos;activera
          d&apos;elle-même et un email vous préviendra ; rien d&apos;autre à faire.
        </Banner>
      ) : (
        <p className="m-0 text-base text-neutre-800">
          Nous attendons la confirmation de votre banque, cela prend quelques secondes.
        </p>
      )}
    </div>
  );
}
