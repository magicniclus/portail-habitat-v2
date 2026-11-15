import { formatFourchette } from '@ph/core/format';
import { cn } from '@ph/ui';
import type { ReactNode } from 'react';
import { BellRingingIcon, CalendarBlankIcon, MapPinIcon } from '@phosphor-icons/react/ssr';
import { EXEMPLES_DEMANDES } from './contenu';

type Demande = (typeof EXEMPLES_DEMANDES)[number];

/**
 * Téléphone de l'espace pro (illustration) : les `n` premières demandes d'exemple, la plus récente
 * en haut ; la dernière arrivée glisse depuis le haut et s'annonce par une notification.
 */
export function TelephoneDemandes({
  n,
  final,
  children,
}: {
  n: number;
  final: boolean;
  /** Posé sur l'écran du téléphone (message final sur mobile). */
  children?: ReactNode;
}) {
  const visibles = EXEMPLES_DEMANDES.slice(0, n).reverse();
  const derniere = EXEMPLES_DEMANDES[n - 1];
  return (
    <div className="relative mx-auto w-[min(330px,100%)] pt-9">
      {/* Notification de la dernière demande arrivée. */}
      {derniere ? (
        <div
          key={derniere.titre}
          aria-hidden="true"
          className="absolute inset-x-[-14px] top-0 z-[3] flex animate-[arrivee_.5s_ease-out] items-center gap-3 rounded-[16px] border border-trait bg-blanc/95 px-3.5 py-2.5 shadow-lg backdrop-blur motion-reduce:animate-none"
        >
          <span className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-accent text-blanc">
            <BellRingingIcon size={20} weight="fill" />
          </span>
          <span className="grid min-w-0 text-[13px] leading-tight">
            <b className="truncate">Nouvelle demande · {derniere.client}</b>
            <span className="truncate text-neutre-700">
              {derniere.titre} · {derniere.ville}
            </span>
          </span>
        </div>
      ) : null}
      <div
        aria-hidden="true"
        className="relative overflow-hidden rounded-[38px] border-[9px] border-texte bg-neutre-100 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-trait bg-blanc px-4 pt-4 pb-3">
          <b className="text-[17px]">Mes demandes</b>
          <span className="rounded-pill bg-accent-100 px-2.5 py-0.5 text-[12px] font-bold text-accent-800">
            {n} nouvelle{n > 1 ? 's' : ''}
          </span>
        </div>
        <ul className="m-0 grid h-[min(400px,calc(100svh-330px))] list-none content-start gap-2.5 overflow-hidden p-3 md:h-[min(480px,56svh)]">
          {visibles.map((d, i) => (
            <Carte key={d.titre} d={d} nouvelle={i === 0} accepter={final && i === 0} />
          ))}
        </ul>
      </div>
      {children}
    </div>
  );
}

function Carte({ d, nouvelle, accepter }: { d: Demande; nouvelle: boolean; accepter: boolean }) {
  return (
    <li
      className={cn(
        'grid gap-1.5 rounded-[14px] border bg-blanc p-3 text-[13px] shadow-sm',
        nouvelle
          ? 'animate-[arrivee_.5s_ease-out] border-accent-300 motion-reduce:animate-none'
          : 'border-trait',
      )}
    >
      <span className="flex items-center gap-2">
        <span className="flex size-8 flex-none items-center justify-center rounded-full bg-accent-100 text-[12px] font-bold text-accent-800">
          {d.client
            .split(' ')
            .map((m) => m[0])
            .join('')}
        </span>
        <b className="text-[14px]">{d.client}</b>
        <span
          className={cn(
            'ml-auto rounded-pill px-2 py-0.5 text-[11px] font-semibold',
            d.vif ? 'bg-accent-100 text-accent-800' : 'bg-neutre-200 text-neutre-800',
          )}
        >
          {d.etiquette}
        </span>
      </span>
      <b className="text-[15px] leading-snug">{d.titre}</b>
      <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-neutre-800">
        <span className="inline-flex items-center gap-1">
          <MapPinIcon size={14} /> {d.ville}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarBlankIcon size={14} /> {d.delai}
        </span>
      </span>
      <span className="flex items-center justify-between gap-2">
        <b className="text-[14px]">{formatFourchette(d.budget[0], d.budget[1])}</b>
        <span
          className={cn(
            'rounded-pill px-3 py-1 text-[12px] font-bold transition-colors duration-300',
            accepter ? 'bg-succes text-blanc' : 'bg-accent-700 text-blanc',
          )}
        >
          {accepter ? 'Client rappelé ✓' : 'Voir la demande'}
        </span>
      </span>
    </li>
  );
}
