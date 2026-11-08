'use client';

import {
  aimanter,
  ajouterPoint,
  dureeFrise,
  finClip,
  modifierPiste,
  rognerClip,
  supprimerPiste,
  supprimerPoint,
  type Frise,
  type LigneSousTitre,
  type TypePiste,
} from '@ph/core/studio';
import { useState, type DragEvent } from 'react';
import { AutomationClip } from './AutomationClip';
import { ClipFrise } from './ClipFrise';
import { EnTetePiste, LARGEUR_EN_TETE } from './EnTetePiste';
import {
  GLISSE_RETOUCHE,
  GLISSE_STUDIO,
  useGlisser,
  type ClipGlisse,
  type RetoucheGlissee,
} from './glisserFrise';
import { LigneSousTitres, SELECTION_SOUS_TITRES } from './LigneSousTitres';
import { RegleFrise } from './RegleFrise';
import { useDeplacementClip } from './useDeplacementClip';

const HAUTEURS_PISTE: Record<TypePiste, number> = { video: 64, audio: 56, texte: 44 };
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
  /** Courbes d'automation modifiables sur le clip choisi. */
  automation: boolean;
  lignes: readonly LigneSousTitre[];
  onSelection: (id: string | null) => void;
  onTete: (ms: number) => void;
  onDebut: () => void;
  onChange: (f: Frise) => void;
  changer: (f: Frise) => void;
  onDepot: (c: ClipGlisse, pisteId: string, debut: number) => void;
  onRetouche: (r: RetoucheGlissee, clipId: string) => void;
  onFichiers: (fichiers: File[], pisteId: string, debut: number) => void;
}) {
  const { frise: f, px } = p;
  const [rognage, setRognage] = useState(false);
  const glisser = useGlisser(px, f, p.onDebut, p.onChange);
  const largeur = Math.max(30_000, dureeFrise(f) + 10_000) * px;
  const hauts = f.pistes.map((x) => HAUTEURS_PISTE[x.type]);
  const reperes = (sauf: string) => [
    p.tete,
    ...f.pistes.flatMap((x) =>
      x.clips.filter((c) => c.id !== sauf).flatMap((c) => [c.debut, finClip(c)]),
    ),
  ];
  const { deplacement, demarrer } = useDeplacementClip({
    frise: f,
    px,
    hauteurs: hauts,
    reperes,
    changer: p.changer,
  });
  const rogner = (applique: Parameters<typeof glisser>[0]) => {
    const g = glisser(applique);
    return (e: Parameters<typeof g>[0]) => {
      setRognage(true);
      window.addEventListener('pointerup', () => setRognage(false), { once: true });
      g(e);
    };
  };
  const deposer = (pisteId: string) => (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    const t = Math.max(
      0,
      Math.round((e.clientX - e.currentTarget.getBoundingClientRect().left) / px),
    );
    if (e.dataTransfer.files.length) return p.onFichiers([...e.dataTransfer.files], pisteId, t);
    const retouche = e.dataTransfer.getData(GLISSE_RETOUCHE);
    if (retouche) {
      const piste = f.pistes.find((x) => x.id === pisteId)!;
      const c = piste.clips.find((x) => t >= x.debut && t < finClip(x));
      if (c) p.onRetouche(JSON.parse(retouche) as RetoucheGlissee, c.id);
      return;
    }
    const brut = e.dataTransfer.getData(GLISSE_STUDIO);
    if (brut) p.onDepot(JSON.parse(brut) as ClipGlisse, pisteId, t);
  };
  const glisse = deplacement
    ? f.pistes.flatMap((x) => x.clips).find((c) => c.id === deplacement.clipId)
    : undefined;

  return (
    <div className="relative" style={{ width: LARGEUR_EN_TETE + largeur }}>
      <RegleFrise largeur={largeur} px={px} tete={p.tete} onTete={p.onTete} />
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
            className={`relative ${deplacement?.pisteId === piste.id ? 'bg-montage-survol' : 'bg-montage-fond/60'}`}
            style={{ width: largeur }}
            onPointerDown={() => p.onSelection(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={deposer(piste.id)}
          >
            {deplacement?.pisteId === piste.id && glisse ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1 bottom-1 rounded-[6px] border-2 border-dashed border-montage-selection"
                style={{ left: deplacement.debut * px, width: glisse.duree * px }}
              />
            ) : null}
            {piste.clips.map((c) => {
              const choisi = p.selection === c.id;
              const param = piste.type === 'audio' ? 'volume' : 'opacite';
              return (
                <ClipFrise
                  key={c.id}
                  frise={f}
                  piste={piste}
                  clip={c}
                  px={px}
                  selectionne={choisi}
                  anime={!rognage && !deplacement}
                  deplacement={deplacement?.clipId === c.id ? deplacement : undefined}
                  onSelection={() => p.onSelection(c.id)}
                  onDeplacer={(e) => demarrer(e, c, i)}
                  onRognerDebut={rogner((dx, depart) =>
                    rognerClip(depart, c.id, {
                      debut: aimanter(c.debut + dx, reperes(c.id), 8 / px),
                    }),
                  )}
                  onRognerFin={rogner((dx, depart) =>
                    rognerClip(depart, c.id, {
                      fin: aimanter(finClip(c) + dx, reperes(c.id), 8 / px),
                    }),
                  )}
                  automation={
                    choisi && p.automation && piste.type !== 'texte' && !piste.verrou ? (
                      <AutomationClip
                        clip={c}
                        param={param}
                        onDebut={p.onDebut}
                        onPoint={(pt, ancien) => {
                          const sans =
                            ancien === undefined ? f : supprimerPoint(f, c.id, param, ancien);
                          p.onChange(ajouterPoint(sans, c.id, param, pt));
                        }}
                        onRetirer={(t) => p.changer(supprimerPoint(f, c.id, param, t))}
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      ))}
      <LigneSousTitres
        lignes={p.lignes}
        actifs={f.sousTitres}
        px={px}
        largeur={largeur}
        selectionne={p.selection === SELECTION_SOUS_TITRES}
        onSelection={() => p.onSelection(SELECTION_SOUS_TITRES)}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 bottom-0 z-40 w-px bg-montage-selection"
        style={{ left: LARGEUR_EN_TETE + p.tete * px }}
      />
    </div>
  );
}
