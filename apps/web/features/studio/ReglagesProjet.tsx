'use client';

import {
  FORMATS_STUDIO,
  NOMS_FORMATS,
  tempsMontage,
  type FormatStudio,
  type Frise,
} from '@ph/core/studio';
import { Interrupteur } from './Curseur';

const AJOUT =
  'min-h-10 rounded-[8px] bg-montage-surface px-3 text-sm font-semibold hover:bg-montage-survol';
const CHAMP =
  'min-h-11 w-full rounded-[8px] border border-montage-trait bg-montage-surface px-3 text-base text-montage-texte';

/**
 * Réglages de toute la vidéo (aucun clip choisi) : format, sous-titres, nappe musicale,
 * miniature (texte de couverture, mot en avant, image à la tête de lecture), ajout de pistes.
 */
export function ReglagesProjet({
  frise: f,
  tete,
  changer,
}: {
  frise: Frise;
  tete: number;
  changer: (f: Frise) => void;
}) {
  const m = f.miniature;
  return (
    <div className="grid gap-4">
      <h3 className="m-0 text-sm font-semibold">Toute la vidéo · {f.titre}</h3>
      <label className="grid gap-1 text-xs">
        <span className="text-montage-texte-doux">Format</span>
        <select
          value={f.format}
          onChange={(e) => changer({ ...f, format: e.target.value as FormatStudio })}
          className={CHAMP}
        >
          {NOMS_FORMATS.map((x) => (
            <option key={x} value={x}>
              {FORMATS_STUDIO[x].libelle}
            </option>
          ))}
        </select>
      </label>
      <Interrupteur
        libelle="Sous-titres automatiques"
        coche={f.sousTitres}
        onChange={(v) => changer({ ...f, sousTitres: v })}
      />
      <Interrupteur
        libelle="Nappe musicale du robot"
        coche={f.musique}
        onChange={(v) => changer({ ...f, musique: v })}
      />
      <fieldset className="grid gap-2 rounded-[8px] border border-montage-trait p-2">
        <legend className="px-1 text-xs font-semibold">Miniature (image de couverture)</legend>
        <label className="grid gap-1 text-xs">
          <span className="text-montage-texte-doux">Texte de la miniature</span>
          <input
            value={m?.texte ?? ''}
            maxLength={40}
            onChange={(e) =>
              changer({
                ...f,
                miniature: e.target.value.trim()
                  ? { texte: e.target.value, accent: m?.accent ?? '', tempsMs: m?.tempsMs ?? 1_200 }
                  : undefined,
              })
            }
            className={CHAMP}
          />
        </label>
        {m ? (
          <>
            <label className="grid gap-1 text-xs">
              <span className="text-montage-texte-doux">Mot mis en avant</span>
              <input
                value={m.accent}
                maxLength={20}
                onChange={(e) => changer({ ...f, miniature: { ...m, accent: e.target.value } })}
                className={CHAMP}
              />
            </label>
            <button
              type="button"
              className={AJOUT}
              onClick={() => changer({ ...f, miniature: { ...m, tempsMs: Math.round(tete) } })}
            >
              Image de couverture : {tempsMontage(m.tempsMs)} → {tempsMontage(tete)}
            </button>
          </>
        ) : null}
      </fieldset>
    </div>
  );
}
