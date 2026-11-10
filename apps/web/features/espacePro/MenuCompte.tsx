'use client';

import type { LienPro } from '@ph/core/espace-pro';
import { SignOutIcon } from '@phosphor-icons/react';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { authClient } from '@/lib/firebaseClient';
import { routes } from '@/lib/routes';
import { LIENS_PRO } from './liens';

const item =
  'flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-[8px] border-0 bg-transparent px-3 text-left text-[15px] text-texte no-underline hover:bg-neutre-100 focus-visible:bg-neutre-100 focus-visible:outline-none';

/**
 * Pastille de l'en-tête (initiales) : un clic ouvre le menu du compte, avec les onglets de Mon
 * compte selon le rôle et « Se déconnecter ». Se ferme à Échap, au clic dehors et après un choix.
 */
export function MenuCompte(p: {
  initiales: string;
  nom: string;
  email: string;
  onglets: LienPro[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [sortie, setSortie] = useState(false);
  const id = useId();
  const racine = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: PointerEvent) => {
      if (!racine.current?.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOuvert(false);
      bouton.current?.focus();
    };
    document.addEventListener('pointerdown', dehors);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('pointerdown', dehors);
      document.removeEventListener('keydown', echap);
    };
  }, [ouvert]);
  const deconnecter = async () => {
    setSortie(true);
    await fetch('/api/session', { method: 'DELETE' }).catch(() => undefined);
    await (await authClient()).signOut().catch(() => undefined);
    window.location.assign(routes.connexionPro);
  };
  return (
    <div ref={racine} className="relative flex-none">
      <button
        ref={bouton}
        type="button"
        aria-label="Mon compte"
        aria-expanded={ouvert}
        aria-controls={id}
        onClick={() => setOuvert((o) => !o)}
        className="flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-accent-200 text-sm font-bold text-accent-800 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-accent"
      >
        {p.initiales}
      </button>
      {ouvert ? (
        <div
          id={id}
          role="group"
          aria-label="Mon compte"
          className="absolute top-full right-0 z-30 mt-2 grid w-max min-w-64 gap-0.5 rounded-[12px] border border-trait bg-blanc p-1.5 shadow-lg"
        >
          <div className="px-3 pt-1.5 pb-2">
            <p className="m-0 truncate font-semibold">{p.nom}</p>
            {p.email && p.email !== p.nom ? (
              <p className="m-0 truncate text-sm text-neutre-700">{p.email}</p>
            ) : null}
          </div>
          <div className="mb-1 border-t border-trait" />
          {p.onglets.map((o) => {
            const { href, Icone } = LIENS_PRO[o.cle];
            return (
              <Link
                key={o.cle}
                href={href as Route}
                className={item}
                onClick={() => setOuvert(false)}
              >
                <Icone size={18} aria-hidden="true" />
                {o.libelle}
              </Link>
            );
          })}
          <div className="my-1 border-t border-trait" />
          <button
            type="button"
            className={`${item} text-danger`}
            disabled={sortie}
            onClick={() => void deconnecter()}
          >
            <SignOutIcon size={18} aria-hidden="true" />
            {sortie ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
