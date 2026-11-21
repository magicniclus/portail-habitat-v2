'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

export interface MesurePage {
  /** Hauteur du document dans la mise en page de référence, en px. */
  hauteur: number;
  /** Rapport entre l'affichage et la mise en page de référence. */
  echelle: number;
  doc: Document | null;
}

const HAUTEUR_MAX = 12_000;

/**
 * Page réelle en arrière-plan (COMPORTEMENT §6) : la page publique est chargée dans un cadre à
 * la largeur de référence (1280, 768 ou 390 px), réduite à la largeur disponible ; les calques
 * se superposent dans le même repère. Le traceur ne mesure jamais une page encadrée.
 */
export function ApercuPage({
  chemin,
  largeur,
  calques,
  defileur,
}: {
  chemin: string;
  largeur: number;
  calques: (m: MesurePage) => ReactNode;
  defileur?: RefObject<HTMLDivElement | null>;
}) {
  const boite = useRef<HTMLDivElement>(null);
  const cadre = useRef<HTMLIFrameElement>(null);
  const [disponible, setDisponible] = useState(900);
  const [mesure, setMesure] = useState<{ hauteur: number; doc: Document | null }>({
    hauteur: 900,
    doc: null,
  });
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setDisponible(Math.round(e!.contentRect.width)));
    if (boite.current) ro.observe(boite.current);
    return () => ro.disconnect();
  }, []);

  const charge = () => {
    // Laisse la page finir son rendu (polices, images) avant de mesurer sa hauteur.
    setTimeout(() => {
      const doc = cadre.current?.contentDocument ?? null;
      const hauteur = doc
        ? Math.min(HAUTEUR_MAX, Math.max(900, doc.documentElement.scrollHeight))
        : 900;
      setMesure({ hauteur, doc });
      setChargement(false);
    }, 800);
  };

  const echelle = Math.min(1, disponible / largeur);
  return (
    <div
      ref={defileur}
      className="h-[74vh] min-h-[420px] overflow-auto rounded-card border border-trait bg-neutre-200"
    >
      <div ref={boite} className="w-full">
        <div
          className="relative mx-auto overflow-hidden bg-blanc"
          style={{ width: largeur * echelle, height: mesure.hauteur * echelle }}
        >
          <iframe
            ref={cadre}
            key={`${chemin}-${largeur}`}
            src={chemin}
            title="Aperçu de la page"
            tabIndex={-1}
            onLoad={charge}
            className="pointer-events-none absolute top-0 left-0 origin-top-left border-0 bg-blanc"
            style={{ width: largeur, height: mesure.hauteur, transform: `scale(${echelle})` }}
          />
          {chargement ? (
            <p className="absolute inset-0 m-0 flex justify-center bg-surface/85 pt-28 text-neutre-800">
              Chargement de la page et calcul des calques…
            </p>
          ) : (
            calques({ ...mesure, echelle })
          )}
        </div>
      </div>
    </div>
  );
}
