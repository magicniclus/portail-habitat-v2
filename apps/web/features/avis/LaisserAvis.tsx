'use client';

import { Stepper } from '@ph/ui';
import { useState } from 'react';
import { ChoixArtisan } from './ChoixArtisan';
import { ConfirmationAvis, EncartsAvis } from './EncartsAvis';
import { FormulaireAvis } from './FormulaireAvis';
import type { ArtisanAvis } from './types';

type Vue =
  | { nom: 'choix' }
  | { nom: 'formulaire'; artisan: ArtisanAvis }
  | {
      nom: 'confirme';
      artisan: ArtisanAvis;
      note: number;
    };

const ETAPES = ['Choisir l’artisan', 'Votre avis', 'Publication'];

/** Maquette « Laisser un avis » : choix de l'artisan, formulaire, confirmation. */
export function LaisserAvis() {
  const [vue, setVue] = useState<Vue>({ nom: 'choix' });
  const aller = (v: Vue) => {
    setVue(v);
    window.scrollTo(0, 0);
  };
  const courante = vue.nom === 'choix' ? 0 : vue.nom === 'formulaire' ? 1 : 2;

  return (
    <>
      <Stepper etapes={ETAPES} courante={courante} className="mb-6" />
      {vue.nom === 'choix' ? (
        <ChoixArtisan onChoisir={(artisan) => aller({ nom: 'formulaire', artisan })} />
      ) : vue.nom === 'formulaire' ? (
        <div className="grid items-start gap-x-[clamp(22px,3vw,40px)] gap-y-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)]">
          <FormulaireAvis
            key={vue.artisan.id}
            artisan={vue.artisan}
            onRetour={() => aller({ nom: 'choix' })}
            onEnvoye={(note) => aller({ nom: 'confirme', artisan: vue.artisan, note })}
          />
          <EncartsAvis artisan={vue.artisan} />
        </div>
      ) : (
        <ConfirmationAvis
          artisan={vue.artisan}
          note={vue.note}
          onRecommencer={() => aller({ nom: 'choix' })}
        />
      )}
    </>
  );
}
