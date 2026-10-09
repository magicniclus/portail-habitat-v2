import { REGLES_CONSEILLEES, REGLES_OBLIGATOIRES, type ContexteBien } from './regles';

export interface TarifDiagnostic {
  id: string;
  prixMinCentimes: number;
  prixMaxCentimes: number;
  /** Durée de validité d'un rapport existant, en années (99 = illimitée). */
  validiteAns: number;
}

export interface ReferentielDiagnostic {
  version: string;
  /** Année des règles (mise à jour au 1er janvier). */
  anneeReference: number;
  obligatoires: TarifDiagnostic[];
  conseilles: TarifDiagnostic[];
  /** Rapports établis avant cette année : à refaire quelle que soit leur validité (DPE 2021, amiante 2013). */
  invalideAvantAnnee: Readonly<Record<string, number>>;
  pack: { seuil: number; coefMin: number; coefMax: number };
}

export type StatutDiagnostic = 'a_realiser' | 'a_refaire' | 'deja_valide' | 'conseille';

export interface LigneDossier {
  diagId: string;
  statut: StatutDiagnostic;
  prixMinCentimes: number;
  prixMaxCentimes: number;
}

export interface ResultatDiagnostic {
  resultat: LigneDossier[];
  minCentimes: number;
  maxCentimes: number;
  remisePack: boolean;
  versionRegles: string;
}

/** Un rapport existant est-il encore valable l'année de référence ? */
export function estEncoreValide(
  t: TarifDiagnostic,
  annee: number,
  r: ReferentielDiagnostic,
): boolean {
  const limite = r.invalideAvantAnnee[t.id];
  if (limite !== undefined && annee < limite) return false;
  return r.anneeReference - annee <= t.validiteAns;
}

/**
 * Dossier de diagnostics d'un bien : obligatoires (à réaliser, à refaire ou réutilisés), conseillés,
 * et estimation avec remise pack à partir de `pack.seuil` diagnostics à réaliser (une seule visite).
 */
export function analyser(
  c: ContexteBien,
  existants: { diagId: string; annee: number }[],
  r: ReferentielDiagnostic,
): ResultatDiagnostic {
  const resultat: LigneDossier[] = [];
  for (const t of r.obligatoires) {
    const regle = REGLES_OBLIGATOIRES[t.id];
    if (!regle) throw new RangeError(`Règle inconnue pour le diagnostic « ${t.id} »`);
    if (!regle(c)) continue;
    const existant = existants.find((e) => e.diagId === t.id);
    const statut: StatutDiagnostic = !existant
      ? 'a_realiser'
      : estEncoreValide(t, existant.annee, r)
        ? 'deja_valide'
        : 'a_refaire';
    resultat.push({
      diagId: t.id,
      statut,
      prixMinCentimes: t.prixMinCentimes,
      prixMaxCentimes: t.prixMaxCentimes,
    });
  }
  for (const t of r.conseilles) {
    if (REGLES_CONSEILLEES[t.id]?.(c)) {
      resultat.push({
        diagId: t.id,
        statut: 'conseille',
        prixMinCentimes: t.prixMinCentimes,
        prixMaxCentimes: t.prixMaxCentimes,
      });
    }
  }
  const aFaire = resultat.filter((l) => l.statut === 'a_realiser' || l.statut === 'a_refaire');
  let min = aFaire.reduce((s, l) => s + l.prixMinCentimes, 0);
  let max = aFaire.reduce((s, l) => s + l.prixMaxCentimes, 0);
  const remisePack = aFaire.length >= r.pack.seuil;
  if (remisePack) {
    min *= r.pack.coefMin;
    max *= r.pack.coefMax;
  }
  return {
    resultat,
    minCentimes: Math.round(min),
    maxCentimes: Math.round(max),
    remisePack,
    versionRegles: r.version,
  };
}
