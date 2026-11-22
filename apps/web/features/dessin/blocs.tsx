import type { ReactNode } from 'react';

/** Petits blocs partagés des panneaux de Plans (inspecteurs, menus). */

/** Surtitre en petites capitales (« SÉLECTION », « EXPORTER »…). */
export const surtitre = 'm-0 text-xs font-bold tracking-wide text-neutre-700 uppercase';

/** Tuile « libellé / valeur » d'une liste `dl` (surface, périmètre, couverture…). */
export function Info({
  libelle,
  valeur,
  large,
  grande,
}: {
  libelle: string;
  valeur: ReactNode;
  /** Sur toute la largeur de la grille. */
  large?: boolean;
  /** Valeur en plus gros (surface d'une pièce). */
  grande?: boolean;
}) {
  return (
    <div className={`rounded-lg bg-neutre-100 px-2.5 py-2 text-sm ${large ? 'col-span-2' : ''}`}>
      <dt className="text-neutre-700">{libelle}</dt>
      <dd className={`m-0 font-bold ${grande ? 'text-[17px]' : ''}`}>{valeur}</dd>
    </div>
  );
}

/** En-tête d'un inspecteur : « SÉLECTION » puis le nom de l'élément. */
export function TitreSelection({ sur = 'Sélection', titre }: { sur?: string; titre: string }) {
  return (
    <div>
      <p className={surtitre}>{sur}</p>
      <h2 className="m-0 text-xl font-bold">{titre}</h2>
    </div>
  );
}

/** Case « Verrouiller » d'un mur ou d'un meuble choisi (DES-29). */
export function CaseVerrou({
  verrouille,
  basculer,
}: {
  verrouille: boolean;
  basculer: (valeur: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-1 text-sm">
      Verrouiller (ni déplacé, ni modifié, ni supprimé)
      <input
        type="checkbox"
        className="size-5 accent-accent"
        checked={verrouille}
        onChange={(ev) => basculer(ev.target.checked)}
      />
    </label>
  );
}

/** Section d'un inspecteur : petit titre en capitales, contenu dessous. */
export function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section aria-label={titre} className="grid gap-2">
      <h3 className={surtitre}>{titre}</h3>
      {children}
    </section>
  );
}

/**
 * Choix exclusif court (2 à 4 options) en boutons segmentés pleine largeur : tout se voit d'un
 * coup d'œil, un clic suffit (au lieu d'une liste déroulante). Cibles de 44 px.
 */
export function Segmente<T extends string>({
  libelle,
  valeur,
  options,
  choisir,
}: {
  libelle: string;
  valeur: T;
  options: readonly { valeur: T; libelle: string; pastille?: string }[];
  choisir: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={libelle} className="grid gap-1">
      <span className="text-[13px] font-semibold text-neutre-800">{libelle}</span>
      <div
        className="grid gap-1 rounded-[10px] bg-neutre-100 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const oui = o.valeur === valeur;
          return (
            <button
              key={o.valeur}
              type="button"
              role="radio"
              aria-checked={oui}
              onClick={() => choisir(o.valeur)}
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-1 text-sm font-semibold font-[inherit] transition-colors ${oui ? 'bg-blanc text-texte shadow-sm' : 'bg-transparent text-neutre-700 hover:text-texte'}`}
            >
              {o.pastille ? (
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full ring-1 ring-neutre-300"
                  style={{ backgroundColor: o.pastille }}
                />
              ) : null}
              {o.libelle}
            </button>
          );
        })}
      </div>
    </div>
  );
}
