'use client';

import { CATALOGUE_STRIPE } from '@ph/core/facturation';
import { formatEuros } from '@ph/core/format';
import { Banner, Button } from '@ph/ui';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

const PACKS = CATALOGUE_STRIPE.filter((p) => p.produit === 'credits');

/**
 * Crédits appels d'offres (maquette Mon Abonnement, PAIEMENTS §3) : solde et packs, payés sur la
 * page Stripe Checkout (règle 7). 1 crédit = 1 € HT, valables 24 mois.
 */
export function CreditsPacks({ solde, peutAcheter }: { solde: number; peutAcheter: boolean }) {
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const acheter = async (cle: string) => {
    setEnCours(cle);
    setErreur(null);
    const r = await posterJson<{ url: string }>('/api/pro/credits/checkout', { cle });
    if (!r.ok) {
      setEnCours(null);
      return setErreur(r.message);
    }
    window.location.assign(r.data.url);
  };
  return (
    <section aria-labelledby="credits" className="grid gap-3 rounded-card border border-trait p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="credits" className="m-0 text-xl">
            Crédits appels d&apos;offres
          </h2>
          <p className="m-0 max-w-[60ch] text-sm text-neutre-700">
            Le prix de chaque appel d&apos;offres est affiché avant achat. Payez à l&apos;unité par
            carte, ou avec vos crédits (1 crédit = 1 € HT).
          </p>
        </div>
        <p className="m-0 text-[15px]">
          Solde : <strong>{solde} crédits</strong>
        </p>
      </div>
      {peutAcheter ? (
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
          {PACKS.map((p) => {
            const offerts = (p.credits ?? 0) - p.montantHt / 100;
            return (
              <li key={p.cle} className="grid gap-2 rounded-card border border-trait p-4">
                <strong className="text-lg">{p.credits} crédits</strong>
                <span className="text-sm text-neutre-800">
                  {formatEuros(p.montantHt)} HT{offerts > 0 ? ` · ${offerts} offerts` : ''}
                </span>
                <Button
                  chargement={enCours === p.cle}
                  variant="secondaire"
                  onClick={() => acheter(p.cle)}
                  disabled={enCours !== null}
                  aria-label={`Acheter ${p.credits} crédits`}
                >
                  {enCours === p.cle ? 'Ouverture…' : 'Acheter'}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </section>
  );
}
