'use client';

import { CRITERES_AVIS, POINTS_POSITIFS, TEXTE_AVIS_MAX } from '@ph/core/avis';
import { Field, Textarea } from '@ph/ui';
import { NoteEtoiles } from './NoteEtoiles';

export type Critere = (typeof CRITERES_AVIS)[number]['id'];
export type Point = (typeof POINTS_POSITIFS)[number];

const titre = 'm-0 mb-1 text-[17px] font-bold';
const aide = 'm-0 mb-3.5 text-sm text-neutre-800';

/** Détail facultatif de l'avis : critères, points forts, commentaire (AVI-02). */
export function DetailAvis({
  criteres,
  onCriteres,
  points,
  onPoints,
  texte,
  onTexte,
  erreurTexte,
}: {
  criteres: Partial<Record<Critere, number>>;
  onCriteres: (c: Partial<Record<Critere, number>>) => void;
  points: Point[];
  onPoints: (p: Point[]) => void;
  texte: string;
  onTexte: (t: string) => void;
  erreurTexte?: string;
}) {
  return (
    <>
      <div>
        <p className={titre}>
          Notez le détail <span className="text-sm font-normal text-neutre-700">(facultatif)</span>
        </p>
        <p className={aide}>C&apos;est ce que les autres particuliers lisent en premier.</p>
        <div className="grid gap-3">
          {CRITERES_AVIS.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-x-3 rounded-[10px] bg-accent-100 px-3.5 py-1.5"
            >
              <span aria-hidden="true" className="text-[15px] font-semibold">
                {c.nom}
              </span>
              <NoteEtoiles
                legende={c.nom}
                taille="petite"
                valeur={criteres[c.id] ?? 0}
                onChange={(n) => onCriteres({ ...criteres, [c.id]: n })}
              />
            </div>
          ))}
        </div>
      </div>

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className={`${titre} mb-3`}>Qu&apos;est-ce qui s&apos;est bien passé ?</legend>
        <div className="flex flex-wrap gap-2.5">
          {POINTS_POSITIFS.map((p) => {
            const actif = points.includes(p);
            return (
              <button
                key={p}
                type="button"
                aria-pressed={actif}
                onClick={() => onPoints(actif ? points.filter((x) => x !== p) : [...points, p])}
                className={`min-h-11 cursor-pointer rounded-pill border px-4 text-sm font-semibold ${actif ? 'border-accent bg-accent text-blanc' : 'border-neutre-400 bg-blanc text-neutre-800'}`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field
        label="Votre commentaire"
        aide="Le chantier réalisé, le déroulé, ce que vous diriez à un voisin."
        erreur={erreurTexte}
      >
        <Textarea
          name="texte"
          rows={5}
          maxLength={TEXTE_AVIS_MAX}
          value={texte}
          onChange={(e) => onTexte(e.target.value.slice(0, TEXTE_AVIS_MAX))}
          placeholder="Ex. Remplacement de la douche et du carrelage dans une salle de bain de 6 m². Devis clair, chantier tenu en 5 jours…"
        />
      </Field>
      <p className="m-0 -mt-4 text-right text-[13px] text-neutre-700">
        {texte.length} / {TEXTE_AVIS_MAX} caractères
        {texte.length > 0 && texte.length < 60 ? ' — quelques lignes de plus aident beaucoup' : ''}
      </p>
    </>
  );
}
