'use client';

import {
  clipParId,
  modifierClip,
  type Clip,
  type Frise,
  type LigneSousTitre,
} from '@ph/core/studio';
import { useMemo, type PointerEvent as EvtPointeur } from 'react';
import { SELECTION_SOUS_TITRES } from './LigneSousTitres';
import { boiteDessin, dessinElement, elementSous } from './toucherApercu';

const borne = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const PLEIN = { x: 0, y: 0, largeur: 1, hauteur: 1, opacite: 1 };
const pct = (v: number) => `${v * 100}%`;

/** Ce que fait un glisser sur l'élément `id` (décalage en fractions de l'image). */
function deplacer(id: string, dx: number, dy: number, depart: Frise): Frise {
  if (id === SELECTION_SOUS_TITRES) {
    const o = depart.decalageSousTitres ?? { x: 0, y: 0 };
    return {
      ...depart,
      decalageSousTitres: { x: borne(o.x + dx, -1, 1), y: borne(o.y + dy, -1, 1) },
    };
  }
  const r = clipParId(depart, id);
  if (!r || r.piste.verrou) return depart;
  if (r.clip.source.type === 'effet') {
    const o = r.clip.decalage ?? { x: 0, y: 0 };
    return modifierClip(depart, id, {
      decalage: { x: borne(o.x + dx, -1, 1), y: borne(o.y + dy, -1, 1) },
    });
  }
  const k = r.clip.cadre ?? PLEIN;
  return modifierClip(depart, id, {
    cadre: { ...k, x: borne(k.x + dx, -1, 2), y: borne(k.y + dy, -1, 2) },
  });
}

/**
 * Sur l'aperçu, on clique directement sur un élément (texte, effet, sous-titres, vidéo
 * incrustée) pour le choisir, et on le glisse pour le déplacer ; le coin d'une vidéo change sa
 * taille. Un seul pas d'annulation par geste.
 */
export function ManipulationApercu(p: {
  frise: Frise;
  t: number;
  lignes: readonly LigneSousTitre[];
  selection: string | null;
  onSelection: (id: string | null) => void;
  onDebut: () => void;
  onChange: (f: Frise) => void;
}) {
  const f = p.frise;
  const geste =
    (appliquer: (dx: number, dy: number, depart: Frise) => Frise) =>
    (e: EvtPointeur<HTMLElement>, zone: DOMRect) => {
      const x0 = e.clientX;
      const y0 = e.clientY;
      const depart = f;
      let commence = false;
      const bouger = (m: PointerEvent) => {
        if (!commence && Math.hypot(m.clientX - x0, m.clientY - y0) < 3) return;
        if (!commence) p.onDebut();
        commence = true;
        p.onChange(
          appliquer((m.clientX - x0) / zone.width, (m.clientY - y0) / zone.height, depart),
        );
      };
      const fin = () => {
        window.removeEventListener('pointermove', bouger);
        window.removeEventListener('pointerup', fin);
      };
      window.addEventListener('pointermove', bouger);
      window.addEventListener('pointerup', fin);
    };
  const choisi = p.selection ? clipParId(f, p.selection) : null;
  const boite = useMemo(() => {
    if (!p.selection) return null;
    const dessin = dessinElement(f, p.selection, p.t, p.lignes);
    return dessin ? boiteDessin(f, dessin) : null;
  }, [f, p.selection, p.t, p.lignes]);
  const cadre =
    choisi && choisi.piste.type === 'video' && choisi.clip.source.type !== 'effet'
      ? (choisi.clip.cadre ?? PLEIN)
      : null;
  const zoneDe = (el: HTMLElement) =>
    (el.closest('[data-apercu]') as HTMLElement).getBoundingClientRect();
  const cadreDe = (depart: Frise): NonNullable<Clip['cadre']> =>
    clipParId(depart, p.selection!)!.clip.cadre ?? PLEIN;

  return (
    <div
      aria-label="Aperçu : cliquez sur un élément pour le choisir, glissez-le pour le déplacer"
      className="absolute inset-0 cursor-pointer"
      onPointerDown={(e) => {
        const zone = zoneDe(e.currentTarget);
        const fx = (e.clientX - zone.left) / zone.width;
        const fy = (e.clientY - zone.top) / zone.height;
        const id = elementSous(f, p.t, fx, fy, p.lignes);
        p.onSelection(id);
        if (id) geste((dx, dy, depart) => deplacer(id, dx, dy, depart))(e, zone);
      }}
    >
      {boite ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute border-2 border-dashed border-montage-selection"
          style={{
            left: pct(boite.x),
            top: pct(boite.y),
            width: pct(boite.largeur),
            height: pct(boite.hauteur),
          }}
        />
      ) : null}
      {cadre ? (
        <span
          role="group"
          aria-label="Place du clip dans l’image : glisser pour déplacer, coin pour la taille"
          className="pointer-events-none absolute border-2 border-montage-selection"
          style={{
            left: pct(cadre.x),
            top: pct(cadre.y),
            width: pct(cadre.largeur),
            height: pct(cadre.hauteur),
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-auto absolute -right-2 -bottom-2 size-4 cursor-nwse-resize rounded-[3px] bg-montage-selection"
            onPointerDown={(e) => {
              e.stopPropagation();
              geste((dx, dy, depart) => {
                const o = cadreDe(depart);
                return modifierClip(depart, p.selection!, {
                  cadre: {
                    ...o,
                    largeur: borne(o.largeur + dx, 0.05, 2),
                    hauteur: borne(o.hauteur + dy, 0.05, 2),
                  },
                });
              })(e, zoneDe(e.currentTarget));
            }}
          />
        </span>
      ) : null}
    </div>
  );
}
