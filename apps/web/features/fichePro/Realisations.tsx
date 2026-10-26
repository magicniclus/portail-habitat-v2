'use client';

import type { RealisationPro } from '@ph/firebase/pro';
import { useRouter } from 'next/navigation';
import { posterJson } from '@/lib/posterJson';
import { CarteProjet } from './CarteProjet';

/** Projets réalisés (maquette Ma Fiche) : grille de cartes, interrupteur « Public », retrait. */
export function Realisations({
  realisations,
  peutModifier,
  nomsMetiers,
}: {
  realisations: RealisationPro[];
  peutModifier: boolean;
  /** Nom affiché de chaque métier (identifiant → libellé). */
  nomsMetiers: Record<string, string>;
}) {
  const router = useRouter();
  const ecrire = async (url: string, corps: object) => {
    const r = await posterJson<null>(url, corps);
    if (r.ok) router.refresh();
  };
  if (!realisations.length)
    return (
      <p className="m-0 text-sm text-neutre-800">
        Montrez vos chantiers : 3 photos au moins rendent votre fiche bien plus rassurante.
      </p>
    );
  return (
    <ul
      aria-label="Projets réalisés"
      className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr))]"
    >
      {realisations.map((r) => (
        <CarteProjet
          key={r.id}
          r={r}
          {...(nomsMetiers[r.metier] ? { nomMetier: nomsMetiers[r.metier] } : {})}
          modifiable={peutModifier}
          basculer={(publie) => void ecrire('/api/pro/realisations/publier', { rid: r.id, publie })}
          retirer={() => void ecrire('/api/pro/realisations/supprimer', { rid: r.id })}
        />
      ))}
    </ul>
  );
}
