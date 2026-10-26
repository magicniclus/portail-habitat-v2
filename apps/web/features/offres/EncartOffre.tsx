'use client';

import { ENCARTS, type CleEncart, type FormulePayante } from '@ph/core/paiements';
import { Button } from '@ph/ui';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { FenetreOffre } from './FenetreOffre';

/**
 * Encart discret dans un outil (PAIEMENTS §4) : une phrase, la fenêtre d'offre, « Plus tard »
 * (masqué 30 jours). Jamais plus d'un par écran : c'est à la page de n'en poser qu'un.
 */
export function EncartOffre({ cle, offre }: { cle: CleEncart; offre: FormulePayante }) {
  const [masque, setMasque] = useState(false);
  if (masque) return null;
  const e = ENCARTS[cle];
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-accent-300 bg-accent-100 p-3">
      <p className="m-0 min-w-0 flex-[1_1_240px] text-[15px] leading-[22px]">{e.texte}</p>
      <FenetreOffre formule={offre} raison={e.raison}>
        Voir l’offre
      </FenetreOffre>
      <Button
        variant="fantome"
        onClick={() => {
          setMasque(true);
          void posterJson('/api/pro/encart', { cle });
        }}
      >
        Plus tard
      </Button>
    </div>
  );
}
