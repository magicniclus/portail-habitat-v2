'use client';

import { useId, useState } from 'react';

/**
 * Note de 1 à 5 en étoiles : boutons radio natifs (clavier ← →, lecteurs d'écran), survol affiché.
 * `libelles` : texte de chaque note (« Excellent »…), affiché à côté pour la note principale.
 */
export function NoteEtoiles({
  legende,
  valeur,
  onChange,
  libelles,
  taille = 'grande',
}: {
  legende: string;
  valeur: number;
  onChange: (n: number) => void;
  libelles?: readonly string[];
  taille?: 'grande' | 'petite';
}) {
  const nom = useId();
  const [survol, setSurvol] = useState(0);
  const affichee = survol || valeur;
  const grande = taille === 'grande';
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" onMouseLeave={() => setSurvol(0)}>
      <legend className="sr-only">{legende}</legend>
      <span className="flex flex-wrap items-center gap-3.5">
        <span className="flex">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              onMouseEnter={() => setSurvol(n)}
              className={`grid cursor-pointer place-items-center leading-none has-focus-visible:outline-2 has-focus-visible:outline-accent-300 ${grande ? 'size-12 text-[40px]' : 'size-11 text-[22px]'} ${n <= affichee ? 'text-etoile' : 'text-neutre-400'}`}
            >
              <input
                type="radio"
                name={nom}
                value={n}
                checked={valeur === n}
                onChange={() => onChange(n)}
                className="sr-only"
              />
              <span aria-hidden="true">★</span>
              <span className="sr-only">
                {n} étoile{n > 1 ? 's' : ''}
                {libelles?.[n] ? ` : ${libelles[n]}` : ''}
              </span>
            </label>
          ))}
        </span>
        {libelles ? (
          <span aria-hidden="true" className="min-h-[26px] text-[19px] font-bold text-accent-700">
            {affichee ? libelles[affichee] : ''}
          </span>
        ) : null}
      </span>
    </fieldset>
  );
}
