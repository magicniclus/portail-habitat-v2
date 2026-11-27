'use client';

import type { Objet } from '@ph/core/dessin';
import { Button } from '@ph/ui';
import { COULEURS_OBJETS, COULEURS_PLAN_TRAVAIL, COULEURS_POIGNEES } from '@ph/ui/tokens';
import type { Dispatch } from 'react';
import type { Action } from './etat';
import { Nuancier } from './Nuancier';
import { Section } from './blocs';

/**
 * Couleurs d'un meuble (DES-22, DES-23). Meuble de cuisine : façades, plan de travail et
 * poignées, puis « Appliquer à toute la cuisine » ; autre objet : une seule couleur.
 */
export function CouleursObjet({
  o,
  cuisine,
  dispatch,
}: {
  o: Objet;
  cuisine: boolean;
  dispatch: Dispatch<Action>;
}) {
  const choisir = (emplacement: string) => (couleur: string) =>
    dispatch({
      type: 'modifierObjet',
      id: o.id,
      modif: { materiaux: { ...o.materiaux, [emplacement]: couleur } },
    });
  const facade = (
    <Nuancier
      legende={cuisine ? 'Façades' : 'Couleur'}
      teintes={COULEURS_OBJETS}
      active={o.materiaux.facade}
      choisir={(t) => choisir('facade')(t.couleur)}
      libre={choisir('facade')}
    />
  );
  if (!cuisine) return facade;
  return (
    <Section titre="Couleurs du meuble">
      <div className="grid gap-4">
        {facade}
        <Nuancier
          legende="Plan de travail"
          teintes={COULEURS_PLAN_TRAVAIL}
          active={o.materiaux.plan}
          choisir={(t) => choisir('plan')(t.couleur)}
          libre={choisir('plan')}
        />
        <Nuancier
          legende="Poignées"
          teintes={COULEURS_POIGNEES}
          active={o.materiaux.poignee}
          choisir={(t) => choisir('poignee')(t.couleur)}
          libre={choisir('poignee')}
        />
        <Button
          variant="secondaire"
          onClick={() => dispatch({ type: 'harmoniserCuisine', depuis: o.id })}
        >
          Appliquer à toute la cuisine
        </Button>
      </div>
    </Section>
  );
}
