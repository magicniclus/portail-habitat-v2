'use client';

import { INACTIVITE_ADMIN_MS } from '@ph/core/admin';
import { Logo, MenuPleinEcran } from '@ph/ui';
import { CaretDoubleLeftIcon, SignOutIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { routes } from '@/lib/routes';
import { deconnecterAdmin } from './deconnexion';

export interface LienAdmin {
  id: string;
  libelle: string;
  chemin: string;
  icone: string;
}

const CLE_MENU = 'ph-admin-menu';
const lireMenu = () => {
  try {
    return localStorage.getItem(CLE_MENU) !== 'replie';
  } catch {
    return true;
  }
};
const ecouter = (f: () => void) => {
  window.addEventListener('storage', f);
  return () => window.removeEventListener('storage', f);
};

function Icone({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

/** Déconnexion après 30 min sans activité (ADMIN §1) ; le serveur le revérifie à chaque page. */
function useInactivite() {
  useEffect(() => {
    let minuterie = setTimeout(() => void deconnecterAdmin('inactivite'), INACTIVITE_ADMIN_MS);
    const relancer = () => {
      clearTimeout(minuterie);
      minuterie = setTimeout(() => void deconnecterAdmin('inactivite'), INACTIVITE_ADMIN_MS);
    };
    const evenements = ['pointerdown', 'keydown', 'scroll'] as const;
    for (const e of evenements) window.addEventListener(e, relancer, { passive: true });
    return () => {
      clearTimeout(minuterie);
      for (const e of evenements) window.removeEventListener(e, relancer);
    };
  }, []);
}

/**
 * Coque du back-office (maquette « Admin Portail Habitat ») : menu à icônes filtré par les
 * permissions, repliable à 72 px (état mémorisé), menu plein écran sur mobile.
 */
export function CoqueAdmin({
  liens,
  nom,
  role,
  children,
}: {
  liens: LienAdmin[];
  nom: string;
  role: string;
  children: ReactNode;
}) {
  const chemin = usePathname();
  const ouvertMemo = useSyncExternalStore(ecouter, lireMenu, () => true);
  const [ouvert, setOuvert] = useState<boolean | null>(null);
  const deplie = ouvert ?? ouvertMemo;
  useInactivite();
  const basculer = () => {
    setOuvert(!deplie);
    try {
      localStorage.setItem(CLE_MENU, deplie ? 'replie' : 'ouvert');
    } catch {
      // Stockage indisponible : l'état reste celui de la session.
    }
  };
  const actif = (l: LienAdmin) =>
    l.chemin ? chemin.startsWith(`/admin/${l.chemin}`) : chemin === '/admin';
  const lien = (l: LienAdmin, fermer?: () => void) => (
    <Link
      key={l.id}
      href={routes.adminSection(l.chemin)}
      onClick={fermer}
      aria-current={actif(l) ? 'page' : undefined}
      title={deplie ? undefined : l.libelle}
      className="flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium text-accent-300 no-underline hover:bg-accent hover:text-blanc aria-[current=page]:bg-accent aria-[current=page]:font-bold aria-[current=page]:text-blanc"
    >
      <Icone d={l.icone} />
      <span className={deplie ? '' : 'sr-only'}>{l.libelle}</span>
    </Link>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-fond md:flex-row">
      <header className="flex items-center justify-between gap-3 bg-accent-700 px-4 py-2 md:hidden">
        <Logo variant="admin" taille={28} inverse />
        <MenuPleinEcran titre="Menu de l’administration">
          {(fermer) => <nav className="grid gap-1">{liens.map((l) => lien(l, fermer))}</nav>}
        </MenuPleinEcran>
      </header>
      <aside
        data-deplie={deplie}
        className="sticky top-0 hidden h-dvh w-[72px] flex-none flex-col gap-1 overflow-y-auto bg-accent-700 px-3 py-4 transition-[width] duration-200 motion-reduce:transition-none data-[deplie=true]:w-[252px] md:flex"
      >
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          {deplie ? <Logo variant="admin" taille={28} inverse /> : null}
          <button
            type="button"
            onClick={basculer}
            aria-label={deplie ? 'Replier le menu' : 'Déplier le menu'}
            aria-expanded={deplie}
            className="flex size-11 items-center justify-center rounded-[10px] text-accent-300 hover:bg-accent"
          >
            <CaretDoubleLeftIcon aria-hidden="true" className={deplie ? '' : 'rotate-180'} />
          </button>
        </div>
        <nav aria-label="Sections de l’administration" className="grid gap-1">
          {liens.map((l) => lien(l))}
        </nav>
        <div className="mt-auto grid gap-2 border-t border-accent pt-3 text-[13px] text-accent-300">
          {deplie ? (
            <p className="m-0 px-1">
              <strong className="block text-blanc">{nom}</strong>
              {role}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void deconnecterAdmin()}
            className="flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-left hover:bg-accent hover:text-blanc"
          >
            <SignOutIcon aria-hidden="true" className="size-5" />
            <span className={deplie ? '' : 'sr-only'}>Se déconnecter</span>
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
