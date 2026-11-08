'use client';

import {
  dupliquerClip,
  modifierClip,
  supprimerClip,
  tempsMontage,
  type Calque,
  type Clip,
  type Frise,
} from '@ph/core/studio';
import { ChampsCalque } from './ChampsCalque';
import { ChampsScene } from './ChampsScene';
import { PresentationClip } from './PresentationClip';
import { Curseur, pourcent, secondes } from './Curseur';

const VITESSES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const;
const CADRES: { libelle: string; cadre: Clip['cadre'] }[] = [
  { libelle: 'Plein écran', cadre: undefined },
  {
    libelle: 'Coin bas droit',
    cadre: { x: 0.6, y: 0.62, largeur: 0.36, hauteur: 0.3, opacite: 1 },
  },
  {
    libelle: 'Coin haut gauche',
    cadre: { x: 0.04, y: 0.04, largeur: 0.36, hauteur: 0.3, opacite: 1 },
  },
  { libelle: 'Moitié haute', cadre: { x: 0, y: 0, largeur: 1, hauteur: 0.5, opacite: 1 } },
  { libelle: 'Moitié basse', cadre: { x: 0, y: 0.5, largeur: 1, hauteur: 0.5, opacite: 1 } },
];
const ACTION =
  'min-h-10 flex-1 rounded-[8px] bg-montage-surface px-2 text-sm font-semibold hover:bg-montage-survol disabled:opacity-40';

/** Onglet Clip : actions, contenu (carton, effet), vitesse, fondus, place dans l'image. */
export function ReglagesClip({
  frise,
  clip: c,
  image,
  changer,
  onSupprime,
}: {
  frise: Frise;
  clip: Clip;
  /** Le clip est sur une piste vidéo (cadre et opacité). */
  image: boolean;
  changer: (f: Frise) => void;
  onSupprime: () => void;
}) {
  const m = (champs: Partial<Omit<Clip, 'id'>>) => changer(modifierClip(frise, c.id, champs));
  const fondus = c.fondus ?? { entree: 0, sortie: 0 };
  const s = c.source;
  return (
    <div className="grid gap-3">
      <p className="m-0 text-xs text-montage-texte-doux tabular-nums">
        De {tempsMontage(c.debut)} à {tempsMontage(c.debut + c.duree)} ({secondes(c.duree)})
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className={ACTION}
          onClick={() => changer(dupliquerClip(frise, c.id))}
        >
          Dupliquer
        </button>
        <button
          type="button"
          className={ACTION}
          onClick={() => {
            changer(supprimerClip(frise, c.id));
            onSupprime();
          }}
        >
          Supprimer
        </button>
      </div>
      {s.type === 'carton' ? (
        <label className="grid gap-1 text-xs">
          <span className="text-montage-texte-doux">Texte du carton</span>
          <input
            value={s.texte}
            maxLength={80}
            onChange={(e) =>
              e.target.value.trim() && m({ source: { ...s, texte: e.target.value } })
            }
            className="min-h-11 rounded-[8px] border border-montage-trait bg-montage-surface px-3 text-base text-montage-texte"
          />
        </label>
      ) : null}
      {s.type === 'effet' ? (
        <div className="grid gap-3 rounded-[8px] bg-blanc p-3 text-texte">
          <ChampsCalque
            calque={s.calque}
            onChange={(champs) =>
              m({ source: { ...s, calque: { ...s.calque, ...champs } as Calque } })
            }
          />
          <ChampsScene
            calque={s.calque}
            onChange={(champs) =>
              m({ source: { ...s, calque: { ...s.calque, ...champs } as Calque } })
            }
          />
        </div>
      ) : null}
      {'debutSource' in s ? (
        <label className="grid gap-1 text-xs">
          <span className="text-montage-texte-doux">Vitesse</span>
          <select
            value={c.vitesse ?? 1}
            onChange={(e) => m({ vitesse: Number(e.target.value) })}
            className="min-h-11 rounded-[8px] border border-montage-trait bg-montage-surface px-3 text-base text-montage-texte"
          >
            {VITESSES.map((v) => (
              <option key={v} value={v}>
                {v}×
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <Curseur
        libelle="Fondu d’entrée"
        valeur={fondus.entree}
        min={0}
        max={Math.min(5_000, c.duree)}
        pas={100}
        neutre={0}
        affichage={secondes}
        onChange={(v) => m({ fondus: { ...fondus, entree: v } })}
      />
      <Curseur
        libelle="Fondu de sortie"
        valeur={fondus.sortie}
        min={0}
        max={Math.min(5_000, c.duree)}
        pas={100}
        neutre={0}
        affichage={secondes}
        onChange={(v) => m({ fondus: { ...fondus, sortie: v } })}
      />
      {image && s.type !== 'effet' && s.type !== 'carton' ? (
        <PresentationClip appareil={c.appareil} onChange={(appareil) => m({ appareil })} />
      ) : null}
      {image && s.type !== 'effet' && !c.appareil ? (
        <>
          <label className="grid gap-1 text-xs">
            <span className="text-montage-texte-doux">Place dans l’image</span>
            <select
              value={CADRES.findIndex(
                (x) =>
                  JSON.stringify({ ...x.cadre, opacite: 1 }) ===
                  JSON.stringify({ ...c.cadre, opacite: 1 }),
              )}
              onChange={(e) => {
                const x = CADRES[Number(e.target.value)]!.cadre;
                m({ cadre: x ? { ...x, opacite: c.cadre?.opacite ?? 1 } : undefined });
              }}
              className="min-h-11 rounded-[8px] border border-montage-trait bg-montage-surface px-3 text-base text-montage-texte"
            >
              <option value={-1} disabled>
                Personnalisée
              </option>
              {CADRES.map((x, i) => (
                <option key={x.libelle} value={i}>
                  {x.libelle}
                </option>
              ))}
            </select>
          </label>
          <Curseur
            libelle="Opacité"
            valeur={c.cadre?.opacite ?? 1}
            min={0}
            max={1}
            pas={0.05}
            neutre={1}
            affichage={pourcent}
            onChange={(v) =>
              m({ cadre: { ...(c.cadre ?? { x: 0, y: 0, largeur: 1, hauteur: 1 }), opacite: v } })
            }
          />
        </>
      ) : null}
    </div>
  );
}
