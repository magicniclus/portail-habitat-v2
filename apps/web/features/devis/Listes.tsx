import {
  LIBELLES_STATUT_DEVIS,
  LIBELLES_STATUT_FACTURE,
  LIBELLES_TYPE_FACTURE,
  tonStatut,
} from '@ph/core/devis';
import { formatDate, formatEuros } from '@ph/core/format';
import type { DevisResume, FactureResume } from '@ph/firebase/devis';
import { Badge, EmptyState } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';

const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });
const ligne =
  'grid gap-1 rounded-[12px] border border-trait bg-blanc p-4 text-texte no-underline hover:border-accent-300 min-[800px]:grid-cols-[150px_minmax(0,1fr)_140px_130px] min-[800px]:items-center';

export function ListeDevis({ devis }: { devis: DevisResume[] }) {
  if (!devis.length)
    return (
      <EmptyState titre="Aucun devis pour l’instant">
        Créez votre premier devis : les mentions obligatoires sont vérifiées pour vous.
      </EmptyState>
    );
  return (
    <ul className="m-0 grid list-none gap-2 p-0" aria-label="Devis">
      {devis.map((d) => (
        <li key={d.id}>
          <Link href={routes.proUnDevis(d.id)} className={ligne}>
            <strong>{d.numero}</strong>
            <span className="truncate">
              {d.client || 'Client à préciser'} · {d.objet || 'Sans objet'}
            </span>
            <span className="font-semibold min-[800px]:text-right">{eur(d.ttcCentimes)}</span>
            <span className="min-[800px]:text-right">
              <Badge tone={tonStatut(d.statut)}>
                {LIBELLES_STATUT_DEVIS[d.statut as keyof typeof LIBELLES_STATUT_DEVIS] ?? d.statut}
              </Badge>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ListeFactures({ factures }: { factures: FactureResume[] }) {
  if (!factures.length)
    return (
      <EmptyState titre="Aucune facture">
        Une facture se crée depuis un devis accepté, en un clic.
      </EmptyState>
    );
  return (
    <ul className="m-0 grid list-none gap-2 p-0" aria-label="Factures">
      {factures.map((f) => (
        <li key={f.id}>
          <Link href={routes.proFactureClient(f.id)} className={ligne}>
            <strong>{f.numero}</strong>
            <span className="truncate">
              {LIBELLES_TYPE_FACTURE[f.type]} · {f.client}
              {f.echeanceLe && f.type !== 'avoir' ? ` · échéance ${formatDate(f.echeanceLe)}` : ''}
            </span>
            <span className="font-semibold min-[800px]:text-right">
              {f.type === 'avoir' ? '− ' : ''}
              {eur(f.ttcCentimes)}
            </span>
            <span className="min-[800px]:text-right">
              <Badge tone={f.annulee ? 'neutre' : tonStatut(f.statut)}>
                {f.annulee
                  ? 'Annulée par avoir'
                  : (LIBELLES_STATUT_FACTURE[f.statut as keyof typeof LIBELLES_STATUT_FACTURE] ??
                    f.statut)}
              </Badge>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
