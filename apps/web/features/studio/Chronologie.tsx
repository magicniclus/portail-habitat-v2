'use client';

import { dureePlan } from '@ph/core/studio';
import {
  ArrowsHorizontalIcon,
  MagnetIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ScissorsIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { FriseMontage } from './FriseMontage';
import { LARGEUR_ETIQUETTE } from './LigneFrise';

/** Pixels par milliseconde au zoom 1 (60 px par seconde). */
const PX_MS = 0.06;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 8;
const borne = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
const OUTIL =
  'flex size-10 items-center justify-center rounded-[8px] text-montage-texte hover:bg-montage-survol disabled:opacity-40 disabled:hover:bg-transparent aria-pressed:bg-montage-survol aria-pressed:text-montage-selection';

type PropsFrise = Omit<ComponentProps<typeof FriseMontage>, 'px' | 'largeurVisible' | 'aimant'>;

/**
 * Zone de montage du bas : outils (scinder, supprimer, aimant, zoom, ajuster) et pistes qui
 * défilent. Ctrl + molette zoome ; la frise s'ajuste à la largeur à l'ouverture.
 */
export function Chronologie({
  onScinder,
  onSupprimer,
  ...frise
}: PropsFrise & { onScinder: () => void; onSupprimer: (() => void) | undefined }) {
  const zone = useRef<HTMLDivElement>(null);
  const [largeurVisible, setLargeurVisible] = useState(800);
  const [zoom, setZoom] = useState<number | null>(null);
  const [aimant, setAimant] = useState(true);
  const duree = dureePlan(frise.plan);
  const ajuste = borne((largeurVisible - LARGEUR_ETIQUETTE - 48) / (duree * PX_MS));
  const z = zoom ?? ajuste;

  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    const mesure = new ResizeObserver(() => setLargeurVisible(el.clientWidth));
    mesure.observe(el);
    // Ctrl + molette : zoom (écouteur non passif pour bloquer le zoom du navigateur).
    const molette = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((v) => borne((v ?? ajuste) * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    };
    el.addEventListener('wheel', molette, { passive: false });
    return () => {
      mesure.disconnect();
      el.removeEventListener('wheel', molette);
    };
  }, [ajuste]);

  return (
    <div className="grid h-full min-h-0 grid-rows-[44px_minmax(0,1fr)] bg-montage-panneau">
      <div className="flex items-center gap-1 border-b border-montage-trait px-2">
        <button
          type="button"
          className={OUTIL}
          onClick={onScinder}
          aria-label="Scinder à la tête de lecture (S)"
          title="Scinder (S)"
        >
          <ScissorsIcon size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={OUTIL}
          onClick={onSupprimer}
          disabled={!onSupprimer}
          aria-label="Supprimer la sélection (Suppr)"
          title="Supprimer (Suppr)"
        >
          <TrashIcon size={20} aria-hidden="true" />
        </button>
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-montage-trait" />
        <button
          type="button"
          className={OUTIL}
          aria-pressed={aimant}
          onClick={() => setAimant(!aimant)}
          aria-label="Aimant"
          title="Aimant : caler sur les coupes et la tête de lecture"
        >
          <MagnetIcon size={20} aria-hidden="true" />
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className={OUTIL}
            onClick={() => setZoom(borne(z / 1.4))}
            aria-label="Dézoomer"
          >
            <MagnifyingGlassMinusIcon size={20} aria-hidden="true" />
          </button>
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.05}
            value={z}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom de la frise"
            className="w-32 accent-[var(--color-montage-selection)]"
          />
          <button
            type="button"
            className={OUTIL}
            onClick={() => setZoom(borne(z * 1.4))}
            aria-label="Zoomer"
          >
            <MagnifyingGlassPlusIcon size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={OUTIL}
            onClick={() => setZoom(null)}
            aria-label="Ajuster à la largeur"
            title="Ajuster à la largeur"
          >
            <ArrowsHorizontalIcon size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div ref={zone} className="min-h-0 overflow-auto">
        <FriseMontage {...frise} px={PX_MS * z} aimant={aimant} largeurVisible={largeurVisible} />
      </div>
    </div>
  );
}
