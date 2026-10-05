'use client';

import { useState } from 'react';
import { enregistrerConsentement } from '@/features/cookies/consentement';

/** Droit d'opposition (COMPORTEMENT §7) : coupe la mesure détaillée en un clic. */
export function LienNePlusMesurer({ className }: { className?: string }) {
  const [fait, setFait] = useState(false);
  if (fait)
    return (
      <span role="status" className="inline-flex min-h-11 items-center">
        Votre visite n&apos;est plus mesurée.
      </span>
    );
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        enregistrerConsentement(false);
        setFait(true);
      }}
    >
      Ne plus mesurer ma visite
    </button>
  );
}
