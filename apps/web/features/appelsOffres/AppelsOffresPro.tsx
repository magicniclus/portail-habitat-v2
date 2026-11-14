'use client';

import { EncartPremium } from '@/features/offres/EncartPremium';
import type { AppelsOffresPro as Donnees } from '@ph/firebase/matching';
import { Banner, EmptyState, bouton } from '@ph/ui';
import Link from 'next/link';
import { useState } from 'react';
import { routes } from '@/lib/routes';
import { CarteAppelOffresPro } from './CarteAppelOffresPro';
import { FeuilleDeblocage } from './FeuilleDeblocage';

/** Maquette « Appels d Offres » : bandeau Tout inclus, filtres par métier, cartes, déblocage. */
export function AppelsOffresPro({
  d,
  peutDebloquer,
  peutAcheterPack,
  paiementsOuverts,
}: {
  d: Donnees;
  peutDebloquer: boolean;
  peutAcheterPack: boolean;
  paiementsOuverts: boolean;
}) {
  const [filtre, setFiltre] = useState('tous');
  const [ouvert, setOuvert] = useState<string | null>(null);
  const affichees = d.cartes.filter((c) => filtre === 'tous' || c.metier === filtre);
  const choisie = d.cartes.find((c) => c.id === ouvert);

  return (
    <div className="grid gap-5">
      {!d.premium && d.nbReserves > 0 ? (
        <EncartPremium
          formule="tout_inclus"
          titre="Avec Tout inclus, vous voyez ces chantiers 12 h avant les autres"
          cta="Voir Tout inclus"
          raison="L’accès anticipé aux appels d’offres est inclus dans Tout inclus."
          icone="chantiers"
        >
          Sur les {d.cartes.length} appels d’offres de votre zone, {d.nbReserves}{' '}
          {d.nbReserves > 1 ? 'sont encore réservés' : 'est encore réservé'} aux comptes Tout inclus
          : répondez avant que les places partent.
        </EncartPremium>
      ) : null}
      {!paiementsOuverts ? (
        <Banner tone="info">
          Le déblocage des appels d’offres ouvre bientôt : vous pouvez déjà consulter les chantiers.
        </Banner>
      ) : null}
      {d.filtres.length > 2 ? (
        <div role="group" aria-label="Filtrer par métier" className="flex gap-2 overflow-x-auto">
          {d.filtres.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filtre === f.id}
              onClick={() => setFiltre(f.id)}
              className="min-h-11 flex-none cursor-pointer rounded-pill border border-trait bg-blanc px-4 text-sm font-semibold whitespace-nowrap aria-pressed:border-accent-action aria-pressed:bg-accent-action aria-pressed:text-blanc"
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}
      <p className="m-0 text-sm text-neutre-800" aria-live="polite">
        {affichees.length} chantier{affichees.length > 1 ? 's' : ''} affiché
        {affichees.length > 1 ? 's' : ''}
      </p>
      {affichees.length ? (
        <ul aria-label="Appels d’offres" className="m-0 grid list-none gap-3 p-0">
          {affichees.map((c) => (
            <CarteAppelOffresPro
              key={c.id}
              c={c}
              peutDebloquer={peutDebloquer && paiementsOuverts}
              ouvrir={() => setOuvert(c.id)}
            />
          ))}
        </ul>
      ) : (
        <EmptyState titre="Rien qui vous corresponde pour l’instant ?">
          Élargissez votre rayon d’intervention ou ajoutez des prestations à votre fiche pour
          recevoir plus d’appels d’offres.{' '}
          <Link href={routes.proFiche} className={bouton({ variant: 'fantome' })}>
            Modifier mes prestations
          </Link>
        </EmptyState>
      )}
      {choisie ? (
        <FeuilleDeblocage
          carte={choisie}
          premium={d.premium}
          portefeuille={d}
          peutAcheterPack={peutAcheterPack}
          fermer={() => setOuvert(null)}
        />
      ) : null}
    </div>
  );
}
