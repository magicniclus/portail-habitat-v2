'use client';

import {
  ANIMATIONS,
  DELAIS_ANIMATION,
  LIBELLES_ANIMATION,
  type Animation as A,
} from '@ph/core/sites';
import { useId } from 'react';
import { Groupe, Info, Libelle, Segments } from './controles';
import type { ContexteReglages } from './contexte';

const champ = 'min-h-11 w-full rounded-[8px] border border-trait bg-blanc px-3 text-base';

/**
 * Animation à l'apparition (zone ou contenu) : type et délai. Visible dans l'Aperçu et sur le
 * site publié ; jamais dans l'éditeur, ni pour un visiteur qui a demandé moins d'animations.
 */
export function Animation({ anim, c }: { anim: A | undefined; c: ContexteReglages }) {
  const id = useId();
  return (
    <Groupe titre="Animation">
      <div className="grid gap-1.5">
        <Libelle texte="À l’apparition sur l’écran" htmlFor={id} />
        <select
          id={id}
          value={anim?.type ?? ''}
          onChange={(e) => {
            const type = e.target.value as A['type'] | '';
            c.maj({ anim: type ? { type, delai: anim?.delai ?? 0 } : undefined });
          }}
          className={champ}
        >
          <option value="">Aucune</option>
          {ANIMATIONS.map((t) => (
            <option key={t} value={t}>
              {LIBELLES_ANIMATION[t]}
            </option>
          ))}
        </select>
      </div>
      {anim ? (
        <>
          <Segments
            libelle="Délai"
            valeur={anim.delai}
            options={DELAIS_ANIMATION.map((d) => [d, d ? `${d / 1000} s` : 'Aucun'] as const)}
            onChange={(delai) => c.maj({ anim: { ...anim, delai } })}
          />
          <Info>Visible dans l’Aperçu et sur le site en ligne.</Info>
        </>
      ) : null}
    </Groupe>
  );
}
