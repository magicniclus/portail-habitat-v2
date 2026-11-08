'use client';

import { clipParId, modifierClip, type Clip, type Frise } from '@ph/core/studio';
import type { PointerEvent as EvtPointeur } from 'react';
import { SELECTION_SOUS_TITRES } from './LigneSousTitres';

const borne = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const PLEIN = { x: 0, y: 0, largeur: 1, hauteur: 1, opacite: 1 };

/**
 * Sur l'aperçu, l'élément choisi se déplace à la souris : un clip vidéo (cadre, et sa taille par
 * le coin), un effet animé ou les sous-titres (décalage). Un seul pas d'annulation par geste.
 */
export function ManipulationApercu(p: {
  frise: Frise;
  selection: string | null;
  onDebut: () => void;
  onChange: (f: Frise) => void;
}) {
  const f = p.frise;
  const r = p.selection ? clipParId(f, p.selection) : null;
  const geste =
    (appliquer: (dx: number, dy: number, depart: Frise) => Frise) =>
    (e: EvtPointeur<HTMLElement>) => {
      e.stopPropagation();
      const zone = (
        e.currentTarget.closest('[data-apercu]') as HTMLElement
      ).getBoundingClientRect();
      const x0 = e.clientX;
      const y0 = e.clientY;
      const depart = f;
      let commence = false;
      const bouger = (m: PointerEvent) => {
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

  if (p.selection === SELECTION_SOUS_TITRES) {
    const d = f.decalageSousTitres ?? { x: 0, y: 0 };
    return (
      <Poignee
        libelle="Déplacer les sous-titres"
        x={0.5 + d.x}
        y={0.82 + d.y}
        onPointerDown={geste((dx, dy, depart) => {
          const o = depart.decalageSousTitres ?? { x: 0, y: 0 };
          return {
            ...depart,
            decalageSousTitres: { x: borne(o.x + dx, -1, 1), y: borne(o.y + dy, -1, 1) },
          };
        })}
      />
    );
  }
  if (!r || r.piste.verrou) return null;
  const c = r.clip;
  if (c.source.type === 'effet') {
    const d = c.decalage ?? { x: 0, y: 0 };
    return (
      <Poignee
        libelle="Déplacer l’effet"
        x={0.5 + d.x}
        y={0.5 + d.y}
        onPointerDown={geste((dx, dy, depart) => {
          const o = clipParId(depart, c.id)!.clip.decalage ?? { x: 0, y: 0 };
          return modifierClip(depart, c.id, {
            decalage: { x: borne(o.x + dx, -1, 1), y: borne(o.y + dy, -1, 1) },
          });
        })}
      />
    );
  }
  if (r.piste.type !== 'video') return null;
  const k = c.cadre ?? PLEIN;
  const cadre = (depart: Frise) => clipParId(depart, c.id)!.clip.cadre ?? PLEIN;
  const changerCadre = (depart: Frise, champs: Partial<NonNullable<Clip['cadre']>>) =>
    modifierClip(depart, c.id, { cadre: { ...cadre(depart), ...champs } });
  return (
    <div
      role="group"
      aria-label="Place du clip dans l’image : glisser pour déplacer, coin pour la taille"
      className="absolute cursor-move border-2 border-montage-selection"
      style={{
        left: `${k.x * 100}%`,
        top: `${k.y * 100}%`,
        width: `${k.largeur * 100}%`,
        height: `${k.hauteur * 100}%`,
      }}
      onPointerDown={geste((dx, dy, depart) => {
        const o = cadre(depart);
        return changerCadre(depart, { x: borne(o.x + dx, -1, 2), y: borne(o.y + dy, -1, 2) });
      })}
    >
      <span
        aria-hidden="true"
        className="absolute -right-2 -bottom-2 size-4 cursor-nwse-resize rounded-[3px] bg-montage-selection"
        onPointerDown={geste((dx, dy, depart) => {
          const o = cadre(depart);
          return changerCadre(depart, {
            largeur: borne(o.largeur + dx, 0.05, 2),
            hauteur: borne(o.hauteur + dy, 0.05, 2),
          });
        })}
      />
    </div>
  );
}

function Poignee(p: {
  libelle: string;
  x: number;
  y: number;
  onPointerDown: (e: EvtPointeur<HTMLElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={p.libelle}
      title={p.libelle}
      onPointerDown={p.onPointerDown}
      className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-move items-center justify-center rounded-full border-2 border-montage-selection bg-montage-fond/60 text-lg text-montage-selection"
      style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
    >
      ✥
    </button>
  );
}
