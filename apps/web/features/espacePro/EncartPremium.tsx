import { GARANTIES_PREMIUM_MOIS, type PrixAffiches } from '@ph/core/facturation';
import { formatEuros } from '@ph/core/format';
import { bouton } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';

const ht = (c: number) => formatEuros(c, { decimales: 'toujours' });

/** Encart du bas de la barre latérale (maquette) : offre Premium pour qui gère l'abonnement. */
export function EncartPremium({ prix }: { prix: PrixAffiches }) {
  return (
    <section
      aria-labelledby="encart-premium"
      className="grid gap-3 rounded-[14px] border border-trait bg-blanc p-4"
    >
      <p id="encart-premium" className="m-0">
        <span className="rounded-pill bg-accent-action px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-blanc uppercase">
          Premium
        </span>
      </p>
      <p className="m-0 text-[13px] leading-[19px] text-neutre-800">
        ✓ {GARANTIES_PREMIUM_MOIS} demandes garanties chaque mois
      </p>
      <div>
        <p className="m-0 text-sm">
          <strong className="text-[22px] whitespace-nowrap">{ht(prix.premiumAnnuelHtMois)}</strong>{' '}
          <span className="text-xs text-neutre-700">HT / mois</span>
        </p>
        <p className="m-0 mt-0.5 text-xs text-neutre-700">
          Payé à l&apos;année · sans engagement : {ht(prix.premiumMensuelHt)} HT / mois
        </p>
      </div>
      <Link
        href={routes.proAbonnementPremium}
        className={bouton({ taille: 'sm', pleineLargeur: true })}
      >
        Activer Premium
      </Link>
    </section>
  );
}
