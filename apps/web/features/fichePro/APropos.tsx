'use client';

import { useState } from 'react';

const LONGUEUR_COURTE = 280;

/** Texte « À propos » replié au-delà de 280 caractères, avec « Voir plus » (maquette). */
export function TexteAPropos({ pitch, description }: { pitch: string; description: string }) {
  const [deplie, setDeplie] = useState(false);
  const long = description.length > LONGUEUR_COURTE;
  const texte =
    long && !deplie ? `${description.slice(0, LONGUEUR_COURTE).trimEnd()} …` : description;
  return (
    <>
      {pitch ? <p className="m-0 font-semibold">{pitch}</p> : null}
      {description ? (
        <p className="m-0 text-[15.5px] leading-[25px] whitespace-pre-line text-neutre-800">
          {texte}
        </p>
      ) : (
        <p className="m-0 text-sm text-neutre-700">
          Présentez votre entreprise : savoir-faire, chantiers, équipe.
        </p>
      )}
      {long ? (
        <button
          type="button"
          onClick={() => setDeplie(!deplie)}
          aria-expanded={deplie}
          className="min-h-11 cursor-pointer justify-self-start border-0 bg-transparent p-0 text-[15px] font-semibold text-accent-700"
        >
          {deplie ? 'Voir moins' : 'Voir plus'}
        </button>
      ) : null}
    </>
  );
}
