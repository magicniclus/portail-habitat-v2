'use client';

import { ongletsMobiles, type LienPro } from '@ph/core/espace-pro';
import { BottomNav, BottomNavItem, Feuille } from '@ph/ui';
import { DotsThreeOutlineIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { estActif, LIENS_PRO } from './liens';

/** Mobile (MOBILE §6) : barre d'onglets en bas, « Plus » ouvre une feuille avec le reste du menu. */
export function NavMobilePro({
  menu,
  selecteur,
}: {
  menu: { titre: string; liens: LienPro[] }[];
  selecteur: ReactNode;
}) {
  const chemin = usePathname();
  const [plusOuvert, setPlusOuvert] = useState(false);
  const { onglets, plus } = ongletsMobiles(menu);
  const plusActif = plus.some((l) => estActif(chemin, l.cle));
  return (
    <BottomNav aria-label="Espace pro">
      {onglets.map((l) => {
        const { href, Icone } = LIENS_PRO[l.cle];
        return (
          <BottomNavItem
            key={l.cle}
            icone={<Icone />}
            libelle={l.libelle.replace(/^Mes |^Ma /, '')}
            actif={estActif(chemin, l.cle)}
            {...(l.badge ? { badge: l.badge } : {})}
          >
            <Link href={href} />
          </BottomNavItem>
        );
      })}
      {plus.length || selecteur !== null ? (
        <BottomNavItem icone={<DotsThreeOutlineIcon />} libelle="Plus" actif={plusActif}>
          <button type="button" aria-haspopup="dialog" onClick={() => setPlusOuvert(true)} />
        </BottomNavItem>
      ) : null}
      <Feuille open={plusOuvert} onOpenChange={setPlusOuvert} titre="Plus" mode="bas">
        <div className="grid gap-3">
          {selecteur}
          <ul className="m-0 grid list-none gap-1 p-0">
            {plus.map((l) => {
              const { href, Icone } = LIENS_PRO[l.cle];
              return (
                <li key={l.cle}>
                  <Link
                    href={href}
                    onClick={() => setPlusOuvert(false)}
                    aria-current={estActif(chemin, l.cle) ? 'page' : undefined}
                    className="flex min-h-12 items-center gap-3 rounded-[10px] px-3 text-base font-semibold text-texte no-underline hover:bg-neutre-100 aria-[current=page]:bg-accent-100"
                  >
                    <Icone size={22} aria-hidden="true" />
                    {l.libelle}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </Feuille>
    </BottomNav>
  );
}
