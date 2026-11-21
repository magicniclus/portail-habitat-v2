'use client';

import type { SujetStudio } from '@ph/core/studio';
import { Button } from '@ph/ui';
import { useEffect, useState } from 'react';

/** Prompteur : la phrase à dire en grand ; flèches ou boutons pour avancer. */
export function Prompteur({ script }: { script: SujetStudio['script'] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight')
        setI((x) => Math.min(script.length - 1, x + 1));
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [script.length]);
  if (!script.length) return null;
  return (
    <section
      aria-label="Prompteur"
      className="grid gap-2 rounded-card bg-neutre-900 p-4 text-blanc"
    >
      <p className="m-0 text-xs opacity-80">
        Phrase {i + 1} / {script.length} · flèches du clavier pour avancer
      </p>
      <p className="m-0 text-[clamp(20px,2.6vw,30px)] font-bold leading-snug" aria-live="polite">
        {script[i]!.voix}
      </p>
      {script[i + 1] ? (
        <p className="m-0 text-base opacity-60">Ensuite : {script[i + 1]!.voix}</p>
      ) : null}
      <div className="flex gap-2">
        <Button variant="secondaire" taille="sm" disabled={i === 0} onClick={() => setI(i - 1)}>
          Précédente
        </Button>
        <Button
          variant="secondaire"
          taille="sm"
          disabled={i === script.length - 1}
          onClick={() => setI(i + 1)}
        >
          Suivante
        </Button>
      </div>
    </section>
  );
}
