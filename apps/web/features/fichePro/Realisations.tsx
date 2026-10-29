'use client';

import type { RealisationPro } from '@ph/firebase/pro';
import { ImageIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { CarteProjet } from './CarteProjet';
import { FormulaireProjet } from './FormulaireProjet';

/** Projets réalisés (maquette Ma Fiche) : grille de cartes, interrupteur « Public », retrait. */
export function Realisations({
  artisanId,
  realisations,
  peutModifier,
  nomsMetiers,
}: {
  artisanId: string;
  realisations: RealisationPro[];
  peutModifier: boolean;
  /** Nom affiché de chaque métier (identifiant → libellé). */
  nomsMetiers: Record<string, string>;
}) {
  const router = useRouter();
  const [occupe, setOccupe] = useState<string | null>(null);
  const ecrire = async (url: string, corps: { rid: string; publie?: boolean }) => {
    setOccupe(corps.rid);
    const r = await posterJson<null>(url, corps);
    setOccupe(null);
    if (r.ok) router.refresh();
  };
  const grille =
    'm-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr))]';
  if (!realisations.length)
    return (
      <>
        <p className="m-0 text-sm text-neutre-800">
          Montrez vos chantiers : 3 photos au moins rendent votre fiche bien plus rassurante.
        </p>
        {peutModifier ? (
          <ul aria-label="Emplacements de projets" className={grille}>
            {[1, 2, 3].map((n) => (
              <li key={n}>
                <FormulaireProjet
                  artisanId={artisanId}
                  declencheur={
                    <button
                      type="button"
                      className="flex w-full cursor-pointer flex-col overflow-hidden rounded-[14px] border border-dashed border-neutre-400 bg-blanc p-0 text-left hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <span className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 bg-neutre-100 text-sm text-neutre-800">
                        <ImageIcon size={26} aria-hidden="true" />
                        Photo du chantier
                      </span>
                      <span className="grid gap-1 p-3.5">
                        <strong className="text-base">Projet {n}</strong>
                        <span className="text-sm text-accent-700">Ajouter un projet</span>
                      </span>
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
        ) : null}
      </>
    );
  return (
    <ul aria-label="Projets réalisés" className={grille}>
      {realisations.map((r) => (
        <CarteProjet
          key={r.id}
          r={r}
          {...(nomsMetiers[r.metier] ? { nomMetier: nomsMetiers[r.metier] } : {})}
          modifiable={peutModifier}
          occupe={occupe === r.id}
          basculer={(publie) => void ecrire('/api/pro/realisations/publier', { rid: r.id, publie })}
          retirer={() => void ecrire('/api/pro/realisations/supprimer', { rid: r.id })}
        />
      ))}
    </ul>
  );
}
