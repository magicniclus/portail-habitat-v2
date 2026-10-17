import { LIBELLES_STATUT_FACTURE } from '@ph/core/facturation';
import { formatDate, formatEuros } from '@ph/core/format';
import type { FacturePro } from '@ph/firebase/facturation';
import { Badge, bouton, EmptyState } from '@ph/ui';

/** Factures Portail Habitat (miroirs Stripe), avec le lien du PDF hébergé par Stripe. */
export function ListeFactures({ factures }: { factures: FacturePro[] }) {
  return (
    <section aria-labelledby="factures" className="grid gap-3">
      <h2 id="factures" className="m-0 text-xl">
        Factures Portail Habitat
      </h2>
      {factures.length === 0 ? (
        <EmptyState titre="Aucune facture pour le moment" />
      ) : (
        <ul className="m-0 grid list-none rounded-card border border-trait p-0">
          {factures.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-trait px-4 py-3 first:border-t-0"
            >
              <span className="flex flex-[1_1_200px] flex-col">
                <span className="font-semibold">{f.numero}</span>
                <span className="text-sm text-neutre-700">{formatDate(f.date, 'long')}</span>
              </span>
              <span className="font-semibold">
                {formatEuros(f.montantTtcCentimes, { decimales: 'toujours', suffixe: 'TTC' })}
              </span>
              <Badge tone={f.statut === 'paid' ? 'succes' : 'attention'}>
                {LIBELLES_STATUT_FACTURE[f.statut] ?? f.statut}
              </Badge>
              {f.lien ? (
                <a
                  href={f.lien}
                  className={bouton({ variant: 'secondaire', taille: 'sm' })}
                  rel="noopener noreferrer"
                  target="_blank"
                  aria-label={`Télécharger la facture ${f.numero}`}
                >
                  Télécharger
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
