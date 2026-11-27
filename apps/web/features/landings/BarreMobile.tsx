'use client';

import { evenementLanding, type OutilLanding } from '@ph/core/landings';
import { bouton } from '@ph/ui';
import { useEffect, useState, type MouseEvent } from 'react';
import { pousserEvenement } from '@/lib/dataLayer';

/** Un champ de saisie a le focus : sur téléphone, le clavier est ouvert. */
const saisieEnCours = () => {
  const a = document.activeElement;
  return (
    a instanceof HTMLInputElement ||
    a instanceof HTMLSelectElement ||
    a instanceof HTMLTextAreaElement
  );
};

/**
 * Barre fixe des téléphones (< 768 px, LANDINGS §3, décision du 17/11/2026) sur les 4 pages d'entrée :
 * elle apparaît quand le formulaire sort de l'écran, disparaît quand il est visible ou que le
 * clavier est ouvert, et ramène au formulaire avec le curseur dans le premier champ vide.
 */
export function BarreMobile({ outil, libelle }: { outil?: OutilLanding; libelle: string }) {
  const [formulaireVisible, setFormulaireVisible] = useState(true);
  const [clavier, setClavier] = useState(false);
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
    const suivreClavier = () => setClavier(saisieEnCours());
    // Au départ du focus, l'élément actif n'est connu qu'au tour suivant.
    const apresSortie = () => setTimeout(suivreClavier, 0);
    document.addEventListener('focusin', suivreClavier);
    document.addEventListener('focusout', apresSortie);
    return () => {
      io.disconnect();
      document.removeEventListener('focusin', suivreClavier);
      document.removeEventListener('focusout', apresSortie);
    };
  }, []);

  const allerAuFormulaire = (e: MouseEvent<HTMLAnchorElement>) => {
    if (outil) pousserEvenement(evenementLanding('sticky_cta_clicked', outil));
    const f = document.querySelector<HTMLFormElement>('[data-formulaire-inscription]');
    if (!f) return;
    e.preventDefault();
    const champs = [
      ...f.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        'select, input:not([type=hidden]):not([hidden])',
      ),
    ];
    const vide = champs.find((c) => !c.value) ?? champs[0];
    // L'ancre reste dans l'adresse, comme un lien ordinaire (retour arrière, partage).
    history.replaceState(history.state, '', '#inscription');
    document.getElementById('inscription')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    // Sans défilement supplémentaire : le formulaire vient d'être amené à l'écran.
    vide?.focus({ preventScroll: true });
  };

  return (
    <div
      data-barre-mobile
      hidden={formulaireVisible || clavier}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-trait bg-blanc px-4 pt-3 pb-sure shadow-lg md:hidden"
    >
      <a
        href="#inscription"
        onClick={allerAuFormulaire}
        className={bouton({ pleineLargeur: true, taille: 'lg', className: 'min-h-12' })}
      >
        {libelle}
      </a>
    </div>
  );
}
