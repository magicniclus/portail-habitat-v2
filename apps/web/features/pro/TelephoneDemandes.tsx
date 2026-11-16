import { formatFourchette } from '@ph/core/format';
import { cn } from '@ph/ui';
import { CalendarBlankIcon, HouseLineIcon, MapPinIcon } from '@phosphor-icons/react/ssr';
import type { ReactNode } from 'react';
import { EXEMPLES_DEMANDES } from './contenu';

type Demande = (typeof EXEMPLES_DEMANDES)[number];
/** Plus récente en haut : toutes rendues d'avance, les absentes repliées (hauteur 0). */
const ORDRE = EXEMPLES_DEMANDES.map((d, i) => ({ d, i })).reverse();

/**
 * Téléphone de l'espace pro (illustration, façon iPhone) : barre d'état, île, notification du
 * système, liste « Mes demandes ». Chaque demande se déplie en douceur (hauteur, fondu,
 * glissement) et pousse les autres vers le bas ; tout se replie aussi en remontant.
 */
export function TelephoneDemandes({
  n,
  final,
  empile = false,
  apparitions = 0,
  children,
}: {
  n: number;
  final: boolean;
  /** Version empilée (téléphone) : largeur fixe, sans tenir dans la hauteur de l'écran. */
  empile?: boolean;
  /** Version empilée : nombre d'entrées du téléphone à l'écran (rejoue la notification). */
  apparitions?: number;
  /** Posé en bas de l'écran (message final sur mobile). */
  children?: ReactNode;
}) {
  const derniere = EXEMPLES_DEMANDES[n - 1]!;
  return (
    <div
      className={cn(
        'relative mx-auto aspect-[9/19]',
        empile
          ? 'w-[min(310px,86vw)]'
          : 'h-[min(620px,calc(100svh-215px))] md:h-[min(640px,calc(100svh-120px))]',
      )}
    >
      {/* Boutons latéraux. */}
      <span
        aria-hidden="true"
        className="absolute top-[18%] -left-[3px] h-[7%] w-[3px] rounded-l bg-neutre-800"
      />
      <span
        aria-hidden="true"
        className="absolute top-[28%] -left-[3px] h-[11%] w-[3px] rounded-l bg-neutre-800"
      />
      <span
        aria-hidden="true"
        className="absolute top-[24%] -right-[3px] h-[14%] w-[3px] rounded-r bg-neutre-800"
      />
      <div className="relative size-full rounded-[clamp(36px,13%,52px)/clamp(36px,6%,52px)] bg-texte p-[2.6%] shadow-2xl ring-1 ring-neutre-700">
        <div
          aria-hidden="true"
          className="relative flex size-full flex-col overflow-hidden rounded-[clamp(30px,11%,44px)/clamp(30px,5%,44px)] bg-neutre-100"
        >
          {/* Barre d'état et île. */}
          <div className="relative flex h-[6.5%] min-h-9 flex-none items-center justify-between bg-blanc px-[9%] text-[13px] font-semibold">
            <span>9:41</span>
            <span className="absolute top-[22%] left-1/2 h-[58%] w-[31%] -translate-x-1/2 rounded-full bg-black" />
            <span className="flex items-center gap-1">
              <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
                <rect x="0" y="7" width="3" height="4" rx="1" />
                <rect x="4.5" y="5" width="3" height="6" rx="1" />
                <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
                <rect x="13.5" y="0" width="3" height="11" rx="1" />
              </svg>
              <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
                <rect
                  x="0.5"
                  y="0.5"
                  width="21"
                  height="11"
                  rx="3.5"
                  stroke="currentColor"
                  opacity=".4"
                />
                <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" />
                <rect x="22.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".4" />
              </svg>
            </span>
          </div>
          <div className="flex flex-none items-center justify-between border-b border-trait bg-blanc px-4 pt-1 pb-3">
            <b className="text-[17px] whitespace-nowrap">Mes demandes</b>
            <span className="rounded-pill bg-accent-100 px-2.5 py-0.5 text-[12px] font-bold whitespace-nowrap text-accent-800 tabular-nums">
              {n} nouvelle{n > 1 ? 's' : ''}
            </span>
          </div>
          <ul className="m-0 flex min-h-0 flex-1 list-none flex-col overflow-hidden px-3 pt-3">
            {ORDRE.map(({ d, i }) => (
              <li
                key={d.titre}
                className={cn(
                  'grid transition-[grid-template-rows,opacity,translate] duration-700 ease-[cubic-bezier(.22,1,.36,1)]',
                  i < n
                    ? 'grid-rows-[1fr] opacity-100'
                    : '-translate-y-3 grid-rows-[0fr] opacity-0',
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <Carte d={d} nouvelle={i === n - 1} accepter={final && i === n - 1} />
                </div>
              </li>
            ))}
          </ul>
          {/* Notification du système : rejouée à chaque nouvelle demande. Décorative (elle répète la
              demande déjà lue dans la liste), donc masquée aux lecteurs d'écran. Version empilée : jouée
              quand le téléphone entre à l'écran (jamais au chargement, où elle serait à demi opaque). */}
          {empile && !apparitions ? null : (
            <div
              key={empile ? `a${apparitions}` : n}
              aria-hidden="true"
              className="absolute inset-x-[3.5%] top-[7.5%] z-[3] flex animate-[notif_3.2s_ease-out_forwards] items-center gap-2.5 rounded-[18px] bg-blanc/90 px-3 py-2.5 shadow-lg ring-1 ring-black/5 backdrop-blur-md motion-reduce:hidden"
            >
              <span className="flex size-9 flex-none items-center justify-center rounded-[9px] bg-accent-700 text-blanc">
                <HouseLineIcon size={20} weight="fill" />
              </span>
              <span className="grid min-w-0 text-[12.5px] leading-tight">
                <span className="flex justify-between gap-2 text-[11px] text-neutre-700">
                  <span>PORTAIL TRAVAUX</span>
                  <span>maintenant</span>
                </span>
                <b className="truncate">Nouvelle demande · {derniere.client}</b>
                <span className="truncate text-neutre-800">
                  {derniere.titre} · {derniere.ville}
                </span>
              </span>
            </div>
          )}
          <span className="absolute bottom-[1.2%] left-1/2 z-[2] h-[5px] w-[36%] -translate-x-1/2 rounded-full bg-black/80" />
        </div>
        {children}
      </div>
    </div>
  );
}

function Carte({ d, nouvelle, accepter }: { d: Demande; nouvelle: boolean; accepter: boolean }) {
  return (
    <div
      className={cn(
        'mb-2.5 grid gap-1.5 rounded-[14px] border bg-blanc p-3 text-[13px] shadow-sm transition-colors duration-500',
        nouvelle ? 'border-accent-300' : 'border-trait',
      )}
    >
      <span className="flex items-center gap-2">
        <span className="flex size-8 flex-none items-center justify-center rounded-full bg-accent-100 text-[12px] font-bold text-accent-800">
          {d.client
            .split(' ')
            .map((m) => m[0])
            .join('')}
        </span>
        <b className="truncate text-[14px] whitespace-nowrap">{d.client}</b>
        <span
          className={cn(
            'ml-auto rounded-pill px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
            d.vif ? 'bg-accent-100 text-accent-800' : 'bg-neutre-200 text-neutre-800',
          )}
        >
          {d.etiquette}
        </span>
      </span>
      <b className="text-[14.5px] leading-snug">{d.titre}</b>
      <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-neutre-800">
        <span className="inline-flex items-center gap-1">
          <MapPinIcon size={14} /> {d.ville}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarBlankIcon size={14} /> {d.delai}
        </span>
      </span>
      <span className="flex items-center justify-between gap-2">
        <b className="text-[14px] whitespace-nowrap">
          {formatFourchette(d.budget[0], d.budget[1])}
        </b>
        <span
          className={cn(
            'rounded-pill px-3 py-1 text-[12px] font-bold whitespace-nowrap text-blanc transition-colors duration-500',
            accepter ? 'bg-succes' : 'bg-accent-700',
          )}
        >
          {accepter ? 'Client rappelé ✓' : 'Voir la demande'}
        </span>
      </span>
    </div>
  );
}
