'use client';

import type { ResumeArtisan } from '@ph/firebase/comptes';
import { Chargeur, cn } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';

/**
 * Interrupteur « En ligne » de l'en-tête de Ma fiche (ville · rayon quand la fiche est en ligne). La fiche
 * est en ligne dès que le SIREN est reconnu, complète ou non (15/11/2026) ; l'éteindre la retire de
 * l'annuaire jusqu'à ce que l'artisan la rallume. Sans droit `fiche.modifier` : simple pastille.
 */
export function EtatFiche({
  artisan,
  modifiable,
}: {
  artisan: ResumeArtisan;
  modifiable: boolean;
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const zone = [artisan.ville, artisan.rayonKm ? `${artisan.rayonKm} km` : '']
    .filter(Boolean)
    .join(' · ');
  const allumee = artisan.enLigne;
  // SIREN pas encore reconnu (saisi à la main) : on mène à Ma fiche, qui l'explique.
  const enAttente = !allumee && !artisan.peutEtreEnLigne;
  const libelle = allumee ? 'Fiche en ligne' : 'Fiche hors ligne';
  const pastille = cn(
    'inline-flex min-h-11 items-center gap-2 truncate rounded-pill border px-3 text-[13px] font-semibold whitespace-nowrap',
    allumee
      ? 'border-accent-300 bg-accent-100 text-accent-800'
      : 'border-trait bg-neutre-100 text-neutre-800',
  );
  if (!modifiable)
    return (
      <span className={cn(pastille, 'hidden sm:inline-flex')}>
        <span
          aria-hidden="true"
          className={cn('size-2 rounded-full', allumee ? 'bg-accent' : 'bg-neutre-500')}
        />
        {allumee ? `${libelle} · ${zone}` : libelle}
      </span>
    );

  const basculer = async () => {
    if (enAttente) return router.push(routes.proFiche);
    setEnCours(true);
    setErreur(null);
    const r = await posterJson('/api/pro/fiche/en-ligne', { enLigne: !allumee });
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    router.refresh();
  };
  return (
    <span className="relative min-w-0">
      <button
        type="button"
        role="switch"
        aria-checked={allumee}
        aria-label="Fiche en ligne"
        title={
          enAttente
            ? 'Votre fiche sera en ligne dès que le SIREN de votre entreprise aura été vérifié.'
            : allumee
              ? 'Retirer la fiche de l’annuaire'
              : 'Mettre la fiche en ligne'
        }
        disabled={enCours}
        onClick={() => void basculer()}
        className={cn(
          pastille,
          'max-w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-accent max-sm:px-2',
        )}
      >
        {/* Mobile : la bascule seule (l'en-tête ne doit jamais déborder). */}
        <span aria-hidden="true" className="truncate max-sm:hidden">
          {allumee && zone ? `${libelle} · ${zone}` : libelle}
        </span>
        {enCours ? (
          <Chargeur taille="sm" ton="courant" decoratif />
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              'flex h-5 w-9 flex-none rounded-pill p-0.5 motion-safe:transition-colors',
              allumee ? 'justify-end bg-accent' : 'justify-start bg-neutre-400',
            )}
          >
            <span className="size-4 rounded-full bg-blanc shadow-sm" />
          </span>
        )}
      </button>
      {erreur ? (
        <span
          role="alert"
          className="absolute top-full right-0 z-20 mt-1 w-64 rounded-md border border-trait bg-blanc p-2 text-[13px] text-danger shadow-md"
        >
          {erreur}
        </span>
      ) : null}
    </span>
  );
}
