'use client';

import { evenementLanding, type OutilLanding } from '@ph/core/landings';
import { bouton, cn } from '@ph/ui';
import { useEffect, useState } from 'react';
import { pousserEvenement } from '@/lib/dataLayer';

/**
 * Barre fixe des téléphones (≤ 768 px, LANDINGS §3) : masquée dès qu'un formulaire est visible
 * (LAND-05) ; elle ramène au formulaire du hero.
 */
export function BarreMobile({ outil, libelle }: { outil: OutilLanding; libelle: string }) {
  const [formulaireVisible, setFormulaireVisible] = useState(true);
  useEffect(() => {
    const cibles = document.querySelectorAll('[data-formulaire-landing]');
    if (!cibles.length || typeof IntersectionObserver === 'undefined') return;
    const vus = new Set<Element>();
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) vus.add(e.target);
          else vus.delete(e.target);
        }
        setFormulaireVisible(vus.size > 0);
      },
      { threshold: 0.15 },
    );
    cibles.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);
  return (
    <div
      data-barre-mobile
      hidden={formulaireVisible}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-trait bg-blanc px-4 pt-3 pb-sure shadow-lg md:hidden',
      )}
    >
      <a
        href="#inscription"
        onClick={() => pousserEvenement(evenementLanding('sticky_cta_clicked', outil))}
        className={bouton({ pleineLargeur: true, taille: 'lg' })}
      >
        {libelle}
      </a>
    </div>
  );
}
