import { recapPaiement } from '@ph/core/facturation';
import { formatEuros } from '@ph/core/format';
import { CONTENU_OFFRES, NOMS_FORMULE, type FormulePayante } from '@ph/core/paiements';
import { cn } from '@ph/ui';
import { CheckCircleIcon, CrownSimpleIcon } from '@phosphor-icons/react/ssr';

/**
 * Présentation d'une offre (fenêtre d'offre, fenêtre de paiement, « Votre formule ») : badge,
 * promesse, ce que l'offre change, prix mensuel HT en gros, puis les avantages cochés.
 */
export function BandeauOffre({
  formule,
  avantages = true,
  className,
}: {
  formule: FormulePayante;
  avantages?: boolean;
  className?: string;
}) {
  const c = CONTENU_OFFRES[formule];
  const r = recapPaiement(formule);
  return (
    <div className={cn('grid gap-4', className)}>
      <div className="relative isolate overflow-hidden rounded-[16px] bg-accent-100 p-4 sm:p-5">
        <span
          aria-hidden="true"
          className="absolute -top-12 -right-10 -z-10 size-36 rounded-full bg-accent-200 opacity-70"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-16 left-1/3 -z-10 size-28 rounded-full bg-blanc opacity-50"
        />
        <span className="inline-flex items-center gap-1 rounded-pill bg-blanc px-2.5 py-0.5 text-xs font-bold tracking-wide text-accent-800 uppercase">
          <CrownSimpleIcon size={13} weight="fill" aria-hidden="true" />
          {NOMS_FORMULE[formule]}
        </span>
        <p className="m-0 mt-2.5 text-xl leading-tight font-extrabold text-texte">{c.promesse}</p>
        <p className="m-0 mt-1.5 text-[15px] leading-snug text-neutre-800">{c.accroche}</p>
        <p className="m-0 mt-3 flex items-baseline gap-1.5">
          <strong className="text-[32px] leading-none font-extrabold text-accent-800">
            {formatEuros(r.montantHt, { decimales: 'toujours' })}
          </strong>
          <span className="text-sm font-semibold text-neutre-800">HT / mois · sans engagement</span>
        </p>
      </div>
      {avantages ? (
        <ul className="m-0 grid list-none gap-2 p-0 text-[15px]">
          {c.avantages.map((a) => (
            <li key={a} className="flex items-start gap-2">
              <CheckCircleIcon
                size={20}
                weight="fill"
                aria-hidden="true"
                className="flex-none text-accent"
              />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
