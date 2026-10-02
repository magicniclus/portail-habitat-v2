import 'server-only';
import {
  referentielSansPrix,
  type ReferentielDiagnostic,
  type TexteDiagnostic,
} from '@ph/core/diagnostic';
import { cache } from 'react';
import donnees from '../../../docs/data/diagnostics.json';
import regles from '../../../docs/data/diagnostics-regles.json';

interface DiagnosticBrut {
  id: string;
  nom: string;
  prix: [number, number];
  val?: number;
  quand?: string;
  validite?: string;
  note?: string;
  raison?: string;
}

export interface CommuneParcours {
  id: string;
  nom: string;
  /** Absent pour « Autre commune de Gironde » : le code postal est alors saisi. */
  cp?: string;
  presquile: boolean;
}

const d = donnees as unknown as {
  diagnostics: DiagnosticBrut[];
  conseilles: DiagnosticBrut[];
  communes: { id: string; nom: string; cp: string; presquile: boolean }[];
};

const tarif = (x: DiagnosticBrut) => ({
  id: x.id,
  prixMinCentimes: x.prix[0] * 100,
  prixMaxCentimes: x.prix[1] * 100,
  validiteAns: x.val ?? 0,
});

/**
 * Référentiel diagnostic AVEC les prix : serveur uniquement (DIA-06). Même source que le seed de
 * `referentiel/diagnostics` ; la lecture Firestore arrivera avec l'édition dans l'administration.
 */
export const referentielDiagnostic = cache((): ReferentielDiagnostic => ({
  version: regles.version,
  anneeReference: regles.anneeReference,
  obligatoires: d.diagnostics.map(tarif),
  conseilles: d.conseilles.map(tarif),
  invalideAvantAnnee: regles.invalideAvantAnnee,
  pack: regles.pack,
}));

/** Ce que le navigateur reçoit : règles, validités, textes et communes, aucun prix. */
export const parcoursDiagnosticPublic = cache(() => ({
  referentiel: referentielSansPrix(referentielDiagnostic()),
  textes: textesDiagnostic(),
  communes: communesParcours(),
}));

export const textesDiagnostic = cache((): Record<string, TexteDiagnostic> =>
  Object.fromEntries(
    [...d.diagnostics, ...d.conseilles].map((x) => [
      x.id,
      { nom: x.nom, quand: x.quand, validite: x.validite, note: x.note, raison: x.raison },
    ]),
  ),
);

export const communesParcours = cache((): CommuneParcours[] =>
  d.communes.map((c) => ({
    id: c.id,
    nom: c.nom,
    presquile: c.presquile,
    ...(/^\d{5}$/.test(c.cp) ? { cp: c.cp } : {}),
  })),
);
