import type { Champ, ChampNumerique } from '../simulateur/champs';
import type { Reponse } from '../simulateur/types';
import type { BrouillonParcours } from './brouillon';

const estNumerique = (c: Champ): c is ChampNumerique => c.kind === 'slider' || c.kind === 'stepper';

type ReponsesLibres = Readonly<Record<string, unknown>>;

/** Valeur initiale de chaque champ (portage de valeursParDefaut de la maquette). */
export function valeursParDefaut(champs: readonly Champ[]): Record<string, Reponse> {
  const v: Record<string, Reponse> = {};
  for (const c of champs)
    v[c.id] = c.kind === 'chips' ? [] : c.kind === 'options' ? c.options[0]!.v : c.def;
  return v;
}

/** Une réponse reste-t-elle valide dans le référentiel actuel (bornes, options) ? */
export function reponseValide(c: Champ, r: unknown): boolean {
  if (estNumerique(c)) return typeof r === 'number' && r >= c.min && r <= c.max;
  if (c.kind === 'options') return c.options.some((o) => o.v === r);
  return Array.isArray(r) && r.every((k) => c.options.some((o) => o.v === k));
}

export interface Migration {
  reponses: Record<string, Reponse>;
  /** Champs dont la réponse enregistrée n'est plus valide (remplacée par la valeur par défaut). */
  retirees: string[];
  /** Champs du référentiel actuel absents du brouillon (ajoutés depuis). */
  manquantes: string[];
}

/**
 * Garde uniquement les réponses encore valides dans le référentiel actuel (portage de migrer()).
 * Les réponses à des champs qui n'existent plus sont ignorées.
 */
export function migrerReponses(champs: readonly Champ[], enregistrees: ReponsesLibres): Migration {
  const reponses = valeursParDefaut(champs);
  const retirees: string[] = [];
  const manquantes: string[] = [];
  for (const c of champs) {
    const r = enregistrees[c.id];
    if (r === undefined) manquantes.push(c.id);
    else if (reponseValide(c, r)) reponses[c.id] = r as Reponse;
    else retirees.push(c.id);
  }
  return { reponses, retirees, manquantes };
}

/** Réponse en toutes lettres pour le résumé (portage de lisible()). */
export function reponseLisible(c: Champ, val: unknown): string {
  if (estNumerique(c)) return `${String(val).replace('.', ',')} ${c.unite}`;
  if (c.kind === 'options') return c.options.find((o) => o.v === val)?.label ?? '';
  return (Array.isArray(val) ? val : [])
    .map((k) => c.options.find((o) => o.v === k)?.label)
    .filter(Boolean)
    .join(', ');
}

/**
 * Première étape incomplète inférieure ou égale à l'étape enregistrée (§3 « Reprendre »).
 * L'étape enregistrée est celle en cours de saisie : on y revient si les précédentes sont complètes.
 */
export function etapeDeReprise(
  etapeEnregistree: number,
  estComplete: (etape: number) => boolean,
  premiereEtape = 1,
): number {
  for (let e = premiereEtape; e < etapeEnregistree; e++) if (!estComplete(e)) return e;
  return etapeEnregistree;
}

/** Étapes du simulateur : 1 prestation, 2 projet, 3 options, 4 chantier, 5 coordonnées. */
export const ETAPES_SIMULATEUR = 5;

export interface PrestationReprise {
  nom: string;
  champs: readonly Champ[];
}

export interface RepriseSimulateur {
  /** Prestation et deux réponses clés, sans aucun montant (§3). */
  resume: string;
  etape: number;
  reponses: Record<string, Reponse>;
  retirees: string[];
}

/** Prépare l'encart « Reprendre votre estimation ? » : réponses migrées, étape de reprise, résumé. */
export function repriseSimulateur(b: BrouillonParcours, p: PrestationReprise): RepriseSimulateur {
  const m = migrerReponses(p.champs, b.reponses);
  const aRevoir = new Set([...m.retirees, ...m.manquantes]);
  const etape = etapeDeReprise(
    Math.min(b.etape, ETAPES_SIMULATEUR),
    (e) => {
      if (e === 4) return /^\d{5}$/.test(b.chantier?.codePostal ?? '');
      return !p.champs.some((c) => c.e === e && aRevoir.has(c.id));
    },
    2,
  );
  const cles = p.champs
    .filter((c) => c.e === 2)
    .slice(0, 2)
    .map((c) => reponseLisible(c, m.reponses[c.id]))
    .filter(Boolean);
  return {
    resume: [p.nom, ...cles].join(' · '),
    etape,
    reponses: m.reponses,
    retirees: m.retirees,
  };
}

export interface ParametresArrivee {
  prestationId?: string;
  codePostal?: string;
}

export type Arrivee =
  | { mode: 'aucun' }
  | { mode: 'encart'; brouillon: BrouillonParcours }
  | { mode: 'fusion'; brouillon: BrouillonParcours }
  | { mode: 'autre'; brouillon: BrouillonParcours };

/**
 * Arrivée sur le parcours avec ou sans paramètres d'URL (§4) : les paramètres gagnent.
 * - même prestation : reprise proposée en fusionnant (le code postal de l'URL écrase celui du brouillon) ;
 * - autre prestation : lien « Vous aviez aussi commencé une estimation … ».
 */
export function arrivee(b: BrouillonParcours | null, p: ParametresArrivee): Arrivee {
  if (!b) return { mode: 'aucun' };
  if (!p.prestationId) return { mode: 'encart', brouillon: b };
  if (p.prestationId !== b.prestationId) return { mode: 'autre', brouillon: b };
  const cp = (p.codePostal ?? '').replace(/\D/g, '').slice(0, 5);
  if (!cp) return { mode: 'fusion', brouillon: b };
  return { mode: 'fusion', brouillon: { ...b, chantier: { ...b.chantier, codePostal: cp } } };
}
