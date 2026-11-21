import { LIBELLES_STATUT_FACTURE } from '@ph/core/admin';
import { formatDate, formatEuros } from '@ph/core/format';
import type { FinancesAdmin } from '@ph/firebase/admin-serveur';
import { Badge } from '@ph/ui';

const ligne =
  'flex flex-wrap items-center justify-between gap-2 border-t border-trait py-2.5 text-sm';
const TON: Record<string, 'succes' | 'danger' | 'attention' | 'neutre'> = {
  paid: 'succes',
  uncollectible: 'danger',
  open: 'attention',
};

/** Contenu des onglets Factures, Codes promo et Remboursements. */
export function OngletFinances({ f, onglet }: { f: FinancesAdmin; onglet: string }) {
  if (onglet === 'promos')
    return (
      <ul aria-label="Codes promo" className="m-0 list-none p-0">
        {f.codesPromo.length ? null : (
          <li className="text-sm text-neutre-700">Aucun code promo.</li>
        )}
        {f.codesPromo.map((c) => (
          <li key={c.code} className={ligne}>
            <span>
              <strong>{c.code}</strong> · −{c.pourcentage} % · {c.produits.join(', ')}
              {c.actif ? '' : ' · désactivé'}
            </span>
            <span>
              {c.utilisations}
              {c.max ? ` / ${c.max}` : ''} utilisations
            </span>
          </li>
        ))}
      </ul>
    );
  if (onglet === 'remboursements')
    return (
      <ul aria-label="Remboursements" className="m-0 list-none p-0">
        {f.remboursements.length ? null : (
          <li className="text-sm text-neutre-700">Aucun remboursement.</li>
        )}
        {f.remboursements.map((r) => (
          <li key={r.id} className={ligne}>
            <span>
              <strong>{r.client}</strong> · {r.motif}
            </span>
            <span>
              {r.en === 'carte' ? 'sur la carte' : 'en crédits'} · {formatDate(r.le)}
            </span>
          </li>
        ))}
      </ul>
    );
  return (
    <ul aria-label="Factures" className="m-0 list-none p-0">
      {f.factures.length ? null : <li className="text-sm text-neutre-700">Aucune facture.</li>}
      {f.factures.map((x) => (
        <li key={x.id} className={ligne}>
          <span>
            <strong>{x.numero}</strong> · {x.client} · {formatDate(x.le)}
          </span>
          <span className="flex items-center gap-2">
            {formatEuros(x.ht, { suffixe: 'HT' })} · {formatEuros(x.ttc, { suffixe: 'TTC' })}
            <Badge tone={TON[x.statut] ?? 'neutre'}>
              {LIBELLES_STATUT_FACTURE[x.statut] ?? x.statut}
            </Badge>
          </span>
        </li>
      ))}
    </ul>
  );
}
