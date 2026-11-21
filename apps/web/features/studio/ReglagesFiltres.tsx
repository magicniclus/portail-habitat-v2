'use client';

import { modifierClip, type Clip, type Frise } from '@ph/core/studio';
import { Curseur, decibels, Interrupteur, pourcent } from './Curseur';
import { PointsAutomation } from './PointsAutomation';

interface Props {
  frise: Frise;
  clip: Clip;
  tete: number;
  changer: (f: Frise) => void;
}

/** Onglet Son : volume du clip, égaliseur trois bandes, voix claire, réduction de bruit. */
export function ReglagesSon({ frise, clip: c, tete, changer }: Props) {
  const son = c.son ?? {};
  const regler = (champs: Partial<NonNullable<Clip['son']>>) =>
    changer(modifierClip(frise, c.id, { son: { ...son, ...champs } }));
  return (
    <div className="grid gap-3">
      <Curseur
        libelle="Volume du clip"
        valeur={c.volume ?? 1}
        min={0}
        max={2}
        pas={0.05}
        neutre={1}
        affichage={pourcent}
        onChange={(v) => changer(modifierClip(frise, c.id, { volume: v }))}
      />
      <Interrupteur
        libelle="Couper le son de ce clip"
        coche={Boolean(c.muet)}
        onChange={(v) => changer(modifierClip(frise, c.id, { muet: v }))}
      />
      {(['graves', 'mediums', 'aigus'] as const).map((b) => (
        <Curseur
          key={b}
          libelle={{ graves: 'Graves', mediums: 'Médiums', aigus: 'Aigus' }[b]}
          valeur={son[b] ?? 0}
          min={-12}
          max={12}
          pas={1}
          neutre={0}
          affichage={decibels}
          onChange={(v) => regler({ [b]: v })}
        />
      ))}
      <Interrupteur
        libelle="Voix claire (présence, coupe les basses)"
        coche={Boolean(son.voixClaire)}
        onChange={(v) => regler({ voixClaire: v })}
      />
      <Interrupteur
        libelle="Réduction de bruit (souffle, ronflement)"
        coche={Boolean(son.reductionBruit)}
        onChange={(v) => regler({ reductionBruit: v })}
      />
      <PointsAutomation frise={frise} clip={c} param="volume" tete={tete} changer={changer} />
    </div>
  );
}

/** Onglet Image : luminosité, contraste, saturation, chaleur, flou, noir et blanc, opacité. */
export function ReglagesImage({ frise, clip: c, tete, changer }: Props) {
  const fi = c.filtres ?? {};
  const regler = (champs: Partial<NonNullable<Clip['filtres']>>) =>
    changer(modifierClip(frise, c.id, { filtres: { ...fi, ...champs } }));
  const curseurs = [
    ['luminosite', 'Luminosité', -1, 1, 0],
    ['contraste', 'Contraste', 0, 2, 1],
    ['saturation', 'Saturation', 0, 2, 1],
    ['chaleur', 'Chaleur', -1, 1, 0],
  ] as const;
  return (
    <div className="grid gap-3">
      {curseurs.map(([k, libelle, min, max, neutre]) => (
        <Curseur
          key={k}
          libelle={libelle}
          valeur={fi[k] ?? neutre}
          min={min}
          max={max}
          pas={0.05}
          neutre={neutre}
          affichage={(v) => `${v > 0 && neutre === 0 ? '+' : ''}${Math.round(v * 100)}`}
          onChange={(v) => regler({ [k]: v })}
        />
      ))}
      <Curseur
        libelle="Flou"
        valeur={fi.flou ?? 0}
        min={0}
        max={20}
        pas={1}
        neutre={0}
        affichage={(v) => `${v} px`}
        onChange={(v) => regler({ flou: v })}
      />
      <Interrupteur
        libelle="Noir et blanc"
        coche={Boolean(fi.noirEtBlanc)}
        onChange={(v) => regler({ noirEtBlanc: v })}
      />
      <button
        type="button"
        onClick={() => changer(modifierClip(frise, c.id, { filtres: undefined }))}
        className="min-h-10 rounded-[8px] bg-montage-surface text-sm hover:bg-montage-survol"
      >
        Retirer les filtres
      </button>
      <PointsAutomation frise={frise} clip={c} param="opacite" tete={tete} changer={changer} />
    </div>
  );
}
