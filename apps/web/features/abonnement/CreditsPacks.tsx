'use client';

import { CATALOGUE_STRIPE } from '@ph/core/facturation';
import { formatEuros } from '@ph/core/format';
import { Banner, Button, cn } from '@ph/ui';
import { GiftIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

const PACKS = CATALOGUE_STRIPE.filter((p) => p.produit === 'credits');
/** Pack au plus grand bonus proportionnel, mis en avant. */
const MEILLEUR = PACKS.reduce<(typeof PACKS)[number] | undefined>(
  (m, p) => (!m || (p.credits ?? 0) / p.montantHt > (m.credits ?? 0) / m.montantHt ? p : m),
  undefined,
)?.cle;

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
            Répondez aux appels d&apos;offres de votre zone sans sortir la carte à chaque fois. Le
            prix de chaque appel d&apos;offres est affiché avant achat ; 1 crédit = 1 € HT, et les
            plus gros packs vous offrent des crédits en plus.
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
            const conseille = p.cle === MEILLEUR;
            return (
              <li
                key={p.cle}
                className={cn(
                  'relative grid gap-2 rounded-card border p-4',
                  conseille
                    ? 'border-2 border-premium bg-blanc shadow-md'
                    : 'border-trait bg-blanc',
                )}
              >
                {conseille ? (
                  <span className="absolute -top-3 left-4 rounded-full border border-premium bg-premium-fond px-2.5 py-0.5 text-xs font-bold text-premium-texte">
                    Le plus avantageux
                  </span>
                ) : null}
                <strong className="text-2xl">{p.credits} crédits</strong>
                <span className="text-sm text-neutre-800">{formatEuros(p.montantHt)} HT</span>
                {offerts > 0 ? (
                  <span className="inline-flex items-center gap-1 justify-self-start rounded-full bg-succes-fond px-2 py-0.5 text-xs font-bold text-succes">
                    <GiftIcon size={14} weight="fill" aria-hidden="true" />
                    {offerts} crédits offerts
                  </span>
                ) : null}
                <Button
                  chargement={enCours === p.cle}
                  variant={conseille ? 'primaire' : 'secondaire'}
                  onClick={() => acheter(p.cle)}
                  disabled={enCours !== null}
                  aria-label={`Acheter ${p.credits} crédits`}
                  className="mt-auto"
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
