'use client';

import { useEffect, useRef } from 'react';
import { BASE, Ecran, ETAPES, TexteEtape } from './DemoSiteParties';

/**
 * Version empilée de la démo du site (téléphone, écran bas, mouvement réduit) : les 4 étapes l'une
 * sous l'autre. Chaque vidéo se lance, muette, quand elle est bien visible, et s'arrête en sortant ;
 * avec `prefers-reduced-motion`, rien ne se lance seul (bouton lecture).
 */
export function DemoSiteEmpilee() {
  const liste = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      (entrees) =>
        entrees.forEach(({ target, isIntersecting }) => {
          const v = target as HTMLVideoElement;
          if (isIntersecting) void v.play().catch(() => undefined);
          else v.pause();
        }),
      { threshold: 0.6 },
    );
    liste.current?.querySelectorAll('video').forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, []);

  return (
    <ol ref={liste} data-demo-site className="m-0 grid list-none gap-10 p-0 text-left">
      {ETAPES.map((e) => (
        <li key={e.id} className="grid gap-4">
          <TexteEtape i={ETAPES.indexOf(e)} titre={e.titre} texte={e.texte} />
          <Ecran url={e.url}>
            <video
              className="block size-full object-cover"
              src={`${BASE}/${e.id}.mp4`}
              poster={`${BASE}/${e.id}.webp`}
              controls
              muted
              loop
              playsInline
              preload="none"
              aria-label={`${e.titre} : démonstration filmée dans Portail Travaux`}
            />
          </Ecran>
        </li>
      ))}
    </ol>
  );
}
