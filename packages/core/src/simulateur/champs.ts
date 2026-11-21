/**
 * Champs du simulateur (étapes 2 et 3), sans aucun prix : c'est la partie publique du référentiel.
 * Les 9 prestations détaillées décrivent leurs champs dans prestations.json ; les 103 du catalogue
 * les déduisent de leur tarif, comme chargerCatalogue() dans la maquette Simulateur de Devis.
 */
export interface OptionChamp {
  v: string;
  label: string;
  desc?: string;
}

interface ChampBase {
  id: string;
  label: string;
  aide: string;
  /** Étape du simulateur où le champ est posé (2 ou 3). */
  e: number;
}

export interface ChampNumerique extends ChampBase {
  kind: 'slider' | 'stepper';
  min: number;
  max: number;
  pas?: number;
  def: number;
  unite: string;
}

export interface ChampOptions extends ChampBase {
  kind: 'options';
  options: readonly OptionChamp[];
}

export interface ChampChips extends ChampBase {
  kind: 'chips';
  options: readonly OptionChamp[];
}

export type Champ = ChampNumerique | ChampOptions | ChampChips;

/** Forme d'un tarif du catalogue utile aux champs (les montants sont ignorés). */
export interface TarifChamps {
  q: {
    kind: 's' | 'n';
    label: string;
    aide: string;
    min: number;
    max: number;
    pas?: number;
    def: number;
    unite: string;
  };
  choix: readonly (readonly [
    string,
    string,
    string,
    readonly (readonly [string, string, string, ...unknown[]])[],
  ])[];
  extras: readonly (readonly [string, string, ...unknown[]])[];
}

const MONTANT = /\d\s*(?:k)?€/;

/**
 * Champ publiable (COMPTES §6.1, SIM-01b) : les descriptions d'options qui citent un montant en euros
 * (« 15 à 25 €/m² ») sont retirées, aucun prix ne doit apparaître avant l'envoi.
 */
export function champSansMontant(c: Champ): Champ {
  if (c.kind !== 'options' && c.kind !== 'chips') return c;
  return {
    ...c,
    options: c.options.map(({ desc, ...o }) =>
      desc === undefined || MONTANT.test(desc) ? o : { ...o, desc },
    ),
  };
}

/** Champs d'une prestation du catalogue, déduits de son tarif (portage de chargerCatalogue). */
export function champsDuTarif(t: TarifChamps): Champ[] {
  const q = t.q;
  const quantite: ChampNumerique =
    q.kind === 's'
      ? {
          id: 'q',
          kind: 'slider',
          label: q.label,
          aide: q.aide,
          min: q.min,
          max: q.max,
          pas: q.pas,
          def: q.def,
          unite: q.unite,
          e: 2,
        }
      : {
          id: 'q',
          kind: 'stepper',
          label: q.label,
          aide: q.aide,
          min: q.min,
          max: q.max,
          def: q.def,
          unite: q.unite,
          e: 2,
        };
  const champs: Champ[] = [quantite];
  t.choix.forEach(([id, label, aide, options], i) =>
    champs.push({
      id,
      kind: 'options',
      label,
      aide,
      options: options.map(([v, l, desc]) => ({ v, label: l, desc })),
      e: t.extras.length || i === 0 ? 2 : 3,
    }),
  );
  if (t.extras.length)
    champs.push({
      id: 'extras',
      kind: 'chips',
      label: 'Options',
      aide: 'Sélectionnez ce qui vous concerne.',
      options: t.extras.map(([v, label]) => ({ v, label })),
      e: 3,
    });
  return champs;
}
