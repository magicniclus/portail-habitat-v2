import type { Paire, TarifGenerique } from './types';

/**
 * Forme « document » d'un tarif du catalogue : Firestore refuse les tableaux imbriqués, donc les
 * n-uplets de `choix` et `extras` deviennent des objets. Conversion sans perte dans les deux sens.
 */
export interface TarifDocument {
  lib: string;
  unitaire: Paire;
  base: Paire;
  evac: Paire;
  choix: {
    id: string;
    label: string;
    aide: string;
    options: { v: string; label: string; desc: string; coef: number }[];
  }[];
  extras: { v: string; label: string; min: number; max: number; parUnite?: boolean }[];
}

export function tarifVersDocument(t: TarifGenerique): TarifDocument {
  return {
    lib: t.lib,
    unitaire: t.unitaire,
    base: t.base,
    evac: t.evac,
    choix: t.choix.map(([id, label, aide, options]) => ({
      id,
      label,
      aide,
      options: options.map(([v, l, desc, coef]) => ({ v, label: l, desc, coef })),
    })),
    extras: t.extras.map((e) => ({
      v: e[0],
      label: e[1],
      min: e[2],
      max: e[3],
      ...(e.length === 5 ? { parUnite: e[4] } : {}),
    })),
  };
}

export function tarifDepuisDocument(d: TarifDocument): TarifGenerique {
  return {
    lib: d.lib,
    unitaire: d.unitaire,
    base: d.base,
    evac: d.evac,
    choix: d.choix.map((c) => [
      c.id,
      c.label,
      c.aide,
      c.options.map((o) => [o.v, o.label, o.desc, o.coef]),
    ]),
    extras: d.extras.map((e) =>
      e.parUnite === undefined
        ? [e.v, e.label, e.min, e.max]
        : [e.v, e.label, e.min, e.max, e.parUnite],
    ),
  };
}
