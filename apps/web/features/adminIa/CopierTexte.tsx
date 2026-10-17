'use client';

import { useState } from 'react';

/** « Utiliser ce texte » : copie la proposition, à coller dans l'éditeur concerné (rien n'est enregistré). */
export function CopierTexte({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <button
      type="button"
      className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-accent-700 underline"
      onClick={() =>
        void navigator.clipboard.writeText(texte).then(
          () => setCopie(true),
          () => setCopie(false),
        )
      }
    >
      {copie ? 'Texte copié' : 'Utiliser ce texte (copier)'}
    </button>
  );
}
