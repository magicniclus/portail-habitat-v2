import { referenceLisible } from '../references';
import { reponseLisible, reponseValide } from '../parcours/reprise';
import type { Champ, OptionChamp } from '../simulateur/champs';
import type { Referentiel } from '../simulateur/estimer';
import { tarifDepuisDocument, type TarifDocument } from '../simulateur/stockage';
import type { Coefficients, Reponse } from '../simulateur/types';

const JOUR_MS = 86_400_000;

/** COMPTES §2 et SIM-10 : 5 demandes par heure et par client (IP hachée, ou compte connecté). */
export const LIMITE_DEMANDES = { cle: 'demande', max: 5, fenetre: '1h' } as const;

/** Référence donnée au particulier (« PH-7K2Q9M ») ; `alea` fournit des réels dans [0, 1[. */
export const referenceDemande = (alea: () => number) => referenceLisible('PH', alea);

/** Réponse de `creerDemande` : l'écran de résultat affiche cette estimation, jamais celle du navigateur. */
export interface DemandeCreee {
  demandeId: string;
  reference: string;
  prestation: { id: string; nom: string };
  estimation: {
    minCentimes: number;
    maxCentimes: number;
    aidesCentimes: number;
    tvaPourcent: number;
    noteRegion: string;
    postes: { label: string; minCentimes: number; maxCentimes: number }[];
  };
  reponsesLisibles: { question: string; reponse: string }[];
  ville: string;
}

/** Conservation : 3 ans, puis anonymisation par Function planifiée (DATABASE §15). */
export const expirationDemande = (maintenant: number) => new Date(maintenant + 3 * 365 * JOUR_MS);

/** Champ tel que publié dans `referentiel/prestations/items/{id}` (sans prix). */
export interface ChampDocument {
  id: string;
  kind: Champ['kind'];
  label: string;
  aide?: string;
  etape?: number;
  min?: number;
  max?: number;
  pas?: number;
  def?: unknown;
  unite?: string;
  options?: { v: string | number; label: string; desc?: string }[];
}

export function champDepuisDocument(d: ChampDocument): Champ {
  const base = { id: d.id, label: d.label, aide: d.aide ?? '', e: d.etape ?? 2 };
  if (d.kind === 'options' || d.kind === 'chips') {
    const options: OptionChamp[] = (d.options ?? []).map((o) => ({
      v: String(o.v),
      label: o.label,
      ...(o.desc === undefined ? {} : { desc: o.desc }),
    }));
    return { ...base, kind: d.kind, options };
  }
  return {
    ...base,
    kind: d.kind,
    min: d.min ?? 0,
    max: d.max ?? 0,
    ...(d.pas === undefined ? {} : { pas: d.pas }),
    def: typeof d.def === 'number' ? d.def : (d.min ?? 0),
    unite: d.unite ?? '',
  };
}

export interface ReponsesVerifiees {
  /** Réponses aux seuls champs de la prestation (les autres clés sont ignorées). */
  reponses: Record<string, Reponse>;
  /** Résumé en toutes lettres, figé dans la demande (réponses vides omises). */
  lisibles: { question: string; reponse: string }[];
  /** Champs manquants ou hors du référentiel actuel : la demande est refusée. */
  invalides: string[];
}

/** Recontrôle serveur des réponses (bornes, options) contre les champs publiés de la prestation. */
export function verifierReponses(
  champs: readonly Champ[],
  brutes: Readonly<Record<string, unknown>>,
): ReponsesVerifiees {
  const res: ReponsesVerifiees = { reponses: {}, lisibles: [], invalides: [] };
  for (const c of champs) {
    const r = brutes[c.id];
    if (!reponseValide(c, r)) {
      res.invalides.push(c.id);
      continue;
    }
    res.reponses[c.id] = r as Reponse;
    const texte = reponseLisible(c, r);
    if (texte) res.lisibles.push({ question: c.label, reponse: texte });
  }
  return res;
}

export interface DocumentsPrix {
  prestationId: string;
  /** `formule` de l'item public : `detaillee:{id}` ou `generique`. */
  formule: string;
  /** `referentiel/prestations/prix/{id}.parametres` (Admin SDK uniquement). */
  parametres: Record<string, unknown>;
  /** `referentiel/prestations/prix/_coefficients.parametres`. */
  coefficients: Coefficients | Record<string, unknown>;
  version: string;
}

/**
 * Référentiel minimal pour estimer UNE prestation à partir des documents privés : seuls ses
 * paramètres sont lus (une lecture par prestation, COUTS.md), jamais l'ensemble des prix.
 */
export function referentielDepuisDocuments(d: DocumentsPrix): Referentiel {
  const generique = d.formule === 'generique';
  return {
    version: d.version,
    coefficients: d.coefficients as Coefficients,
    detailles: (generique
      ? {}
      : { [d.prestationId]: d.parametres }) as unknown as Referentiel['detailles'],
    catalogue: generique
      ? { [d.prestationId]: tarifDepuisDocument(d.parametres.tarif as TarifDocument) }
      : {},
    tvaCatalogue: generique ? { [d.prestationId]: Number(d.parametres.tva) } : {},
  };
}

export { DELAIS, libelleDelai } from './delais';
