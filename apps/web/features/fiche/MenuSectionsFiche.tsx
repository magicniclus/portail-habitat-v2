'use client';

import { cn } from '@ph/ui';
import { useEffect, useState } from 'react';

/**
 * Mini-menu de la fiche publique (tablette et ordinateur) : un clic fait défiler jusqu'à la
 * section (À propos, Zone, Projets, Avis…), la section visible est soulignée. Collé en haut de
 * l'écran pendant le défilement ; absent sur mobile, où la fiche se lit d'un trait.
 */
export function MenuSectionsFiche({ sections }: { sections: { id: string; libelle: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const cibles = sections
      .map((s) => document.getElementById(s.id))
      .filter((e): e is HTMLElement => e !== null);
    const obs = new IntersectionObserver(
      (entrees) => {
        const visible = entrees
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      // La section « active » est celle qui passe dans le haut de l'écran, sous le menu.
      { rootMargin: '-80px 0px -60% 0px' },
    );
    for (const c of cibles) obs.observe(c);
    return () => obs.disconnect();
  }, [sections]);

  const aller = (id: string) => {
    const doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: doux ? 'smooth' : 'auto' });
    history.replaceState(null, '', `#${id}`);
    setActive(id);
  };

  return (
    <nav
      aria-label="Sections de la fiche"
      className="sticky top-0 z-20 -mx-1 hidden border-b border-trait bg-blanc/95 px-1 backdrop-blur-sm md:block"
    >
      <ul className="m-0 flex list-none gap-1 overflow-x-auto p-0 [scrollbar-width:none]">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                aller(s.id);
              }}
              aria-current={active === s.id ? 'true' : undefined}
              className={cn(
                'inline-flex min-h-11 items-center border-b-2 px-3 text-[15px] font-semibold whitespace-nowrap no-underline',
                active === s.id
                  ? 'border-texte text-texte'
                  : 'border-transparent text-neutre-700 hover:text-texte',
              )}
            >
              {s.libelle}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
