import { formatEuros } from '@ph/core/format';
import {
  CONTENU_OFFRES,
  formulesAllerPlusLoin,
  NOMS_FORMULE,
  offreUrlDe,
  PRIX_FORMULES_HT,
  type Formule,
} from '@ph/core/paiements';
import { bouton, cn } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { routes } from '@/lib/routes';

/**
 * « Aller plus loin » sous « Votre formule » (PAIEMENTS §4, décision du 15/11/2026) : les formules
 * qui ajoutent quelque chose à celle de l'artisan, Site Pro d'abord ; le bouton ouvre la fenêtre de
 * paiement existante (`?offre=`). Rien pour Tout inclus ; visible seulement après l'inscription.
 */
export function AllerPlusLoin({ formule }: { formule: Formule }) {
  const offres = formulesAllerPlusLoin(formule);
  if (!offres.length) return null;
  return (
    <section aria-labelledby="aller-plus-loin" className="grid gap-3">
      <h2 id="aller-plus-loin" className="m-0 text-xl">
        Aller plus loin
      </h2>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {offres.map((f, i) => (
          <li
            key={f}
            className={cn(
              'grid content-start gap-2 rounded-card border p-4',
              i === 0 ? 'border-accent-300 bg-accent-100' : 'border-trait bg-blanc',
            )}
          >
            <span className="flex flex-wrap items-baseline justify-between gap-2">
              <strong className="text-[17px]">{NOMS_FORMULE[f]}</strong>
              <span className="text-[15px] font-semibold whitespace-nowrap">
                {formatEuros(PRIX_FORMULES_HT[f])} HT / mois
              </span>
            </span>
            <span className="text-[15px] leading-[22px] text-neutre-800">
              {CONTENU_OFFRES[f].promesse}
            </span>
            <Link
              href={`${routes.proAbonnement}?offre=${offreUrlDe(f)}` as Route}
              scroll={false}
              className={bouton({
                variant: i === 0 ? 'primaire' : 'secondaire',
                className: 'mt-1 justify-self-start',
              })}
            >
              Choisir {NOMS_FORMULE[f]}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
