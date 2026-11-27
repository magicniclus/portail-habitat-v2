'use client';

import { couleursCuisine } from '@ph/core/dessin';
import { COULEURS_OBJETS, COULEURS_PLAN_TRAVAIL, COULEURS_POIGNEES } from '@ph/ui/tokens';
import type { Dispatch } from 'react';
import { niveauDe, type Action, type EtatEditeur } from './etat';
import { Nuancier } from './Nuancier';

/**
 * Couleurs de toute la cuisine, en tête d'Équiper > Cuisine (DES-23) : façades, plan de travail,
 * poignées. Appliquées aux meubles déjà posés et reprises par ceux posés ensuite.
 */
export function CouleursCuisineMenu({
  etat,
  dispatch,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
}) {
  const actives = { ...etat.couleursCuisine, ...couleursCuisine(niveauDe(etat)) };
  const colorer = (emplacement: 'facade' | 'plan' | 'poignee') => (couleur: string) =>
    dispatch({ type: 'colorerCuisine', couleurs: { [emplacement]: couleur } });
  return (
    <section
      aria-label="Couleurs de la cuisine"
      className="grid gap-3 rounded-xl border border-neutre-200 bg-neutre-100 p-3"
    >
      <h4 className="m-0 text-sm font-bold">Couleurs de la cuisine</h4>
      <Nuancier
        legende="Façades"
        teintes={COULEURS_OBJETS}
        active={actives.facade}
        choisir={(t) => colorer('facade')(t.couleur)}
        libre={colorer('facade')}
      />
      <Nuancier
        legende="Plan de travail"
        teintes={COULEURS_PLAN_TRAVAIL}
        active={actives.plan}
        choisir={(t) => colorer('plan')(t.couleur)}
        libre={colorer('plan')}
      />
      <Nuancier
        legende="Poignées"
        teintes={COULEURS_POIGNEES}
        active={actives.poignee}
        choisir={(t) => colorer('poignee')(t.couleur)}
        libre={colorer('poignee')}
      />
      <p className="m-0 text-[13px] leading-5 text-neutre-800">
        S’applique à toute la cuisine, et aux meubles que vous poserez ensuite.
      </p>
    </section>
  );
}
