'use client';

import {
  aimanter,
  deplacerClip,
  dureeFrise,
  finClip,
  modifierPiste,
  rognerClip,
  supprimerPiste,
  type Frise,
  type SourceClip,
  type TypePiste,
} from '@ph/core/studio';
import type { DragEvent } from 'react';
import { ClipFrise } from './ClipFrise';
import { EnTetePiste, LARGEUR_EN_TETE } from './EnTetePiste';
import { useGlisser } from './glisserFrise';

const HAUTEURS_PISTE: Record<TypePiste, number> = { video: 64, audio: 56, texte: 44 };
/** Type glissé depuis la bibliothèque : une source de clip et sa durée. */
export const GLISSE_STUDIO = 'application/x-studio-clip';
export interface ClipGlisse {
  source: SourceClip;
  duree: number;
}

/**
 * Frise multipistes : règle (clic = déplacer la tête), une ligne par piste avec son en-tête,
 * clips à glisser (dans le temps et d'une piste à l'autre, aimantés aux bords et à la tête),
 * dépôt depuis la bibliothèque ou depuis l'ordinateur.
 */
export function PistesFrise(p: {
  frise: Frise;
  px: number;
  tete: number;
  selection: string | null;
  onSelection: (clipId: string | null) => void;
  onTete: (ms: number) => void;
  onDebut: () => void;
  onChange: (f: Frise) => void;
  changer: (f: Frise) => void;
  onDepot: (c: ClipGlisse, pisteId: string, debut: number) => void;
  onFichiers: (fichiers: File[], pisteId: string, debut: number) => void;
}) {
  const { frise: f, px } = p;
  const glisser = useGlisser(px, f, p.onDebut, p.onChange);
  const largeur = Math.max(30_000, dureeFrise(f) + 10_000) * px;
  const hauts = f.pistes.map((x) => HAUTEURS_PISTE[x.type]);
  const reperes = (sauf: string) => [
    p.tete,
    ...f.pistes.flatMap((x) =>
      x.clips.filter((c) => c.id !== sauf).flatMap((c) => [c.debut, finClip(c)]),
    ),
  ];
  const pisteSous = (depart: number, dy: number) => {
    let i = depart;
    let reste = dy;
    while (reste > hauts[i]! / 2 && i < hauts.length - 1) reste -= hauts[i++]!;
    while (reste < -hauts[i]! / 2 && i > 0) reste += hauts[--i]!;
    return f.pistes[i]!;
  };
  const tempsDepot = (e: DragEvent<HTMLElement>) =>
    Math.max(0, Math.round((e.clientX - e.currentTarget.getBoundingClientRect().left) / px));
  const deposer = (pisteId: string) => (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    const t = tempsDepot(e);
    if (e.dataTransfer.files.length) return p.onFichiers([...e.dataTransfer.files], pisteId, t);
    const brut = e.dataTransfer.getData(GLISSE_STUDIO);
    if (brut) p.onDepot(JSON.parse(brut) as ClipGlisse, pisteId, t);
  };
  const pas = px > 0.08 ? 1_000 : px > 0.02 ? 5_000 : 10_000;

  return (
    <div className="relative" style={{ width: LARGEUR_EN_TETE + largeur }}>
      <div className="sticky top-0 z-30 flex h-6 border-b border-montage-trait bg-montage-panneau">
        <div
          className="sticky left-0 z-10 shrink-0 bg-montage-panneau"
          style={{ width: LARGEUR_EN_TETE }}
        />
        <div
          role="slider"
          tabIndex={0}
          aria-label="Position de lecture"
          aria-valuemin={0}
          aria-valuemax={Math.round(largeur / px)}
          aria-valuenow={Math.round(p.tete)}
          className="relative cursor-pointer"
          style={{ width: largeur }}
          onPointerDown={(e) =>
            p.onTete((e.clientX - e.currentTarget.getBoundingClientRect().left) / px)
          }
        >
          {Array.from({ length: Math.ceil(largeur / px / pas) }, (_, i) => (
            <span
              key={i}
              className="absolute top-0 h-full border-l border-montage-trait pl-1 text-[10px] text-montage-texte-doux"
              style={{ left: i * pas * px }}
            >
              {(i * pas) / 1000}s
            </span>
          ))}
        </div>
      </div>
      {f.pistes.map((piste, i) => (
        <div
          key={piste.id}
          className="flex border-b border-montage-trait"
          style={{ height: hauts[i] }}
        >
          <EnTetePiste
            piste={piste}
            supprimable={f.pistes.filter((x) => x.type === piste.type).length > 1}
            onChange={(champs) => p.changer(modifierPiste(f, piste.id, champs))}
            onSupprimer={() => {
              if (
                !piste.clips.length ||
                window.confirm(`Supprimer « ${piste.nom} » et ses clips ?`)
              )
                p.changer(supprimerPiste(f, piste.id));
            }}
          />
          <div
            data-piste={piste.id}
            aria-label={`Piste ${piste.nom}`}
            className="relative bg-montage-fond/60"
            style={{ width: largeur }}
            onPointerDown={() => p.onSelection(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={deposer(piste.id)}
          >
            {piste.clips.map((c) => (
              <ClipFrise
                key={c.id}
                frise={f}
                piste={piste}
                clip={c}
                px={px}
                selectionne={p.selection === c.id}
                onSelection={() => p.onSelection(c.id)}
                onDeplacer={(e) => {
                  e.stopPropagation();
                  glisser((dx, depart, dy) => {
                    const cible = pisteSous(i, dy);
                    const debut = aimanter(c.debut + dx, reperes(c.id), 8 / px);
                    const r = deplacerClip(depart, c.id, cible.id, debut);
                    // Pendant le geste on ne crée pas de piste : la place doit être libre.
                    return r.pistes.length === depart.pistes.length ? r : depart;
                  })(e);
                }}
                onRognerDebut={glisser((dx, depart) =>
                  rognerClip(depart, c.id, {
                    debut: aimanter(c.debut + dx, reperes(c.id), 8 / px),
                  }),
                )}
                onRognerFin={glisser((dx, depart) =>
                  rognerClip(depart, c.id, {
                    fin: aimanter(finClip(c) + dx, reperes(c.id), 8 / px),
                  }),
                )}
              />
            ))}
          </div>
        </div>
      ))}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 bottom-0 z-40 w-px bg-montage-selection"
        style={{ left: LARGEUR_EN_TETE + p.tete * px }}
      />
    </div>
  );
}
