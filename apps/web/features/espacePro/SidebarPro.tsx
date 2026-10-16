'use client';

import { PAGES_COMPTE, type LienPro } from '@ph/core/espace-pro';
import { cn, Logo } from '@ph/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { routes } from '@/lib/routes';
import { estActif, LIENS_PRO } from './liens';

/** Barre latérale (≥ 1024 px) de la maquette Espace Artisan Dashboard : repliable en icônes seules. */
export function SidebarPro({
  menu,
  ouvert,
  initiales,
  encart,
}: {
  menu: { titre: string; liens: LienPro[] }[];
  ouvert: boolean;
  initiales: string;
  /** Encart du bas de la barre latérale (offre contextuelle, PAIEMENTS §4), facultatif. */
  encart?: ReactNode;
}) {
  const chemin = usePathname();
  return (
    <aside
      id="menu-pro"
      aria-label="Menu de l'espace pro"
      className={cn(
        'sticky top-0 hidden h-dvh flex-none flex-col gap-0.5 overflow-x-hidden overflow-y-auto border-r border-trait bg-blanc px-3.5 pt-4 pb-5 transition-[width] duration-300 motion-reduce:transition-none lg:flex',
        ouvert ? 'w-[252px]' : 'w-[76px]',
      )}
    >
      <Link
        href={routes.proTableauDeBord}
        className="mb-3 flex min-h-11 items-center px-0.5 no-underline"
      >
        <Logo variant="pro" iconeSeule={!ouvert} />
      </Link>
      <nav aria-label="Espace pro" className="grid gap-0.5">
        {menu.map((s) => (
          <div key={s.titre} className="grid gap-0.5">
            {ouvert ? (
              <p className="m-0 px-3 pt-4 pb-1.5 text-xs font-semibold tracking-[0.08em] text-neutre-700 uppercase">
                {s.titre}
              </p>
            ) : null}
            {s.liens.map((l) => {
              const { href, Icone } = LIENS_PRO[l.cle];
              const actif = estActif(chemin, l.cle);
              return (
                <Link
                  key={l.cle}
                  href={href}
                  title={ouvert ? undefined : l.libelle}
                  aria-current={actif ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-[10px] border text-[15px] no-underline',
                    ouvert ? 'px-3' : 'justify-center px-0',
                    actif
                      ? 'border-accent-300 bg-accent-100 font-bold text-accent-800'
                      : 'border-transparent font-medium text-neutre-800 hover:bg-neutre-100',
                  )}
                >
                  <Icone size={20} aria-hidden="true" className="flex-none" />
                  <span className={ouvert ? '' : 'sr-only'}>{l.libelle}</span>
                  {l.badge ? (
                    <span
                      className={cn(
                        'rounded-pill bg-accent-action px-2 text-xs leading-5 font-bold text-blanc',
                        ouvert ? 'ml-auto' : 'sr-only',
                      )}
                    >
                      {l.badge}
                      <span className="sr-only"> nouveaux</span>
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      {ouvert && encart ? <div className="mt-auto pt-4">{encart}</div> : null}
      {/* « Mon compte » épinglé en bas (D63, NAV-01) : profil, équipe, abonnement, aide. */}
      <Link
        href={LIENS_PRO.compte.href}
        title={ouvert ? undefined : 'Mon compte'}
        aria-current={PAGES_COMPTE.some((c) => estActif(chemin, c)) ? 'page' : undefined}
        className={cn(
          'flex min-h-14 items-center gap-3 rounded-[10px] border border-transparent text-neutre-800 no-underline hover:bg-neutre-100 aria-[current=page]:border-accent-300 aria-[current=page]:bg-accent-100',
          encart && ouvert ? 'mt-3' : 'mt-auto',
          ouvert ? 'px-2' : 'justify-center px-0',
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-9 flex-none items-center justify-center rounded-full bg-accent-200 text-sm font-bold text-accent-800"
        >
          {initiales}
        </span>
        <span className={ouvert ? 'grid' : 'sr-only'}>
          <span className="font-bold text-texte">Mon compte</span>
          <span className="text-xs">Équipe · Abonnement · Aide</span>
        </span>
      </Link>
    </aside>
  );
}
