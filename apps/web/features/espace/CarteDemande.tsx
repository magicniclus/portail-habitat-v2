import { formatDate } from '@ph/core/format';
import { LIBELLES_STATUT_PARTICULIER, resumeSuivi } from '@ph/core/espace';
import type { DemandeEspace } from '@ph/firebase/espace';
import { StatusBadge } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';

/** Carte de « Mes projets » : statut, référence, nombre d'artisans et de devis (ESP-01). */
export function CarteDemande({ d, active }: { d: DemandeEspace; active: boolean }) {
  const statut = LIBELLES_STATUT_PARTICULIER[d.statut];
  return (
    <Link
      href={routes.demandeParticulier(d.id)}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col gap-2 rounded-[14px] p-4 text-texte no-underline hover:shadow-md ${active ? 'border-2 border-accent bg-accent-100' : 'border border-trait bg-blanc'}`}
    >
      <span className="flex items-center justify-between gap-2">
        <StatusBadge statut={statut} />
        <span className="text-[13px] text-neutre-700">{d.reference}</span>
      </span>
      <span className="text-[16.5px] leading-[1.3] font-bold">{d.titre}</span>
      <span className="text-sm text-neutre-700">
        {d.ville} · {formatDate(d.envoyeeLe)}
      </span>
      <span className="text-sm font-semibold text-accent-700">{resumeSuivi(d)}</span>
    </Link>
  );
}
