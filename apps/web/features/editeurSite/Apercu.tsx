'use client';

import type { Appareil } from '@ph/core/sites';
import { useEffect, useRef, useState } from 'react';

const LARGEURS: Record<Appareil, number> = { desktop: 1200, tablet: 768, mobile: 390 };

/**
 * Aperçu mis à l'échelle (ordinateur 1200 px, tablette 768, mobile 390) : la page rendue comme en
 * ligne, dans un cadre isolé sans script (aucun accès à l'espace pro).
 */
export function Apercu({ html, appareil }: { html: string; appareil: Appareil }) {
  const largeur = LARGEURS[appareil];
  const ref = useRef<HTMLDivElement>(null);
  const [echelle, setEchelle] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setEchelle(Math.min(1, (e.contentRect.width - 32) / largeur));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [largeur]);
  return (
    <div ref={ref} className="h-full min-h-[60vh] overflow-hidden bg-neutre-200 p-4">
      <div className="mx-auto h-full" style={{ width: largeur * echelle }}>
        <iframe
          title="Aperçu de la page"
          sandbox=""
          srcDoc={html}
          className="block border-0 bg-blanc shadow-lg"
          style={{
            width: largeur,
            height: `${100 / echelle}%`,
            transform: `scale(${echelle})`,
            transformOrigin: '0 0',
          }}
        />
      </div>
    </div>
  );
}
