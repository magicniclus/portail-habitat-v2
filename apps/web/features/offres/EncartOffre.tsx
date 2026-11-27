'use client';

import { ENCARTS, type CleEncart, type FormulePayante } from '@ph/core/paiements';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { EncartPremium } from './EncartPremium';

/**
 * Encart dans un outil (PAIEMENTS §4) : ce que l'offre apporte, la fenêtre d'offre, « Plus tard »
 * (masqué 30 jours). Jamais plus d'un par écran : c'est à la page de n'en poser qu'un.
 */
export function EncartOffre({ cle, offre }: { cle: CleEncart; offre: FormulePayante }) {
  const [masque, setMasque] = useState(false);
  if (masque) return null;
  const e = ENCARTS[cle];
  return (
    <EncartPremium
      formule={offre}
      titre={e.titre}
      cta="Voir l’offre"
      raison={e.raison}
      onPlusTard={() => {
        setMasque(true);
        void posterJson('/api/pro/encart', { cle });
      }}
    >
      {e.texte}
    </EncartPremium>
  );
}
