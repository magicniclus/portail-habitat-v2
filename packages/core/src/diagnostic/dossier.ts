import { referenceLisible } from '../references';
import type { LigneDossier, ReferentielDiagnostic, StatutDiagnostic } from './analyser';

/** Textes publics d'un diagnostic (docs/data/diagnostics.json), sans prix. */
export interface TexteDiagnostic {
  nom: string;
  quand?: string;
  validite?: string;
  note?: string;
  /** Diagnostics conseillés : pourquoi on le recommande. */
  raison?: string;
}

/** Ligne affichée avant l'envoi (DIA-06) : statut et explication, jamais de prix. */
export interface LignePublique {
  diagId: string;
  nom: string;
  statut: StatutDiagnostic;
  raison: string;
}

const phrase = (...morceaux: (string | undefined)[]) =>
  morceaux
    .filter((m): m is string => Boolean(m?.trim()))
    .map((m) => m.trim().replace(/\.$/, ''))
    .join('. ')
    .concat('.');

/** Portage des raisons de la maquette (renderVals → resultats). */
export function lignesPubliques(
  resultat: readonly LigneDossier[],
  textes: Readonly<Record<string, TexteDiagnostic>>,
  existants: readonly { diagId: string; annee: number }[],
): LignePublique[] {
  return resultat.map((l) => {
    const t = textes[l.diagId] ?? { nom: l.diagId };
    const annee = existants.find((e) => e.diagId === l.diagId)?.annee;
    const raison =
      l.statut === 'conseille'
        ? (t.raison ?? '')
        : l.statut === 'deja_valide'
          ? `Votre rapport de ${annee} reste valable : inutile de le refaire.`
          : l.statut === 'a_refaire'
            ? phrase(`Rapport de ${annee} hors délai`, t.quand, t.note)
            : phrase(t.quand, t.validite ? `Validité : ${t.validite}` : undefined);
    return { diagId: l.diagId, nom: t.nom, statut: l.statut, raison };
  });
}

export function resumeDossier(resultat: readonly LigneDossier[]) {
  const aRealiser = resultat.filter(
    (l) => l.statut === 'a_realiser' || l.statut === 'a_refaire',
  ).length;
  const reutilises = resultat.filter((l) => l.statut === 'deja_valide').length;
  const titre = aRealiser
    ? `${aRealiser} diagnostic${aRealiser > 1 ? 's' : ''} à réaliser`
    : 'Aucun diagnostic à refaire';
  return { aRealiser, reutilises, titre };
}

/**
 * Référentiel envoyable au navigateur : règles, validités et seuil du pack, **prix à zéro**. La liste
 * des diagnostics obligatoires est gratuite ; le budget n'est calculé que par le serveur (DIA-06).
 */
export function referentielSansPrix(r: ReferentielDiagnostic): ReferentielDiagnostic {
  const sansPrix = (t: ReferentielDiagnostic['obligatoires'][number]) => ({
    ...t,
    prixMinCentimes: 0,
    prixMaxCentimes: 0,
  });
  return {
    ...r,
    obligatoires: r.obligatoires.map(sansPrix),
    conseilles: r.conseilles.map(sansPrix),
    pack: { seuil: r.pack.seuil, coefMin: 1, coefMax: 1 },
  };
}

/** Référence d'un dossier de diagnostics (« PHD-7K2Q9M »). */
export const referenceDossier = (alea: () => number) => referenceLisible('PHD', alea);
