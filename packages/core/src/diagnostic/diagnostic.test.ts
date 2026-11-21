import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyser, estEncoreValide, type ReferentielDiagnostic } from './analyser';
import { REGLES_CONSEILLEES, REGLES_OBLIGATOIRES, type ContexteBien } from './regles';

const lire = (f: string) => JSON.parse(readFileSync(resolve(__dirname, f), 'utf8'));
const donnees = lire('../../../../docs/data/diagnostics.json') as {
  diagnostics: { id: string; prix: [number, number]; val: number }[];
  conseilles: { id: string; prix: [number, number] }[];
};
const regles = lire('../../../../docs/data/diagnostics-regles.json');
const tarif = (d: { id: string; prix: [number, number]; val?: number }) => ({
  id: d.id,
  prixMinCentimes: d.prix[0] * 100,
  prixMaxCentimes: d.prix[1] * 100,
  validiteAns: d.val ?? 0,
});
const r: ReferentielDiagnostic = {
  version: regles.version,
  anneeReference: regles.anneeReference,
  obligatoires: donnees.diagnostics.map(tarif),
  conseilles: donnees.conseilles.map(tarif),
  invalideAvantAnnee: regles.invalideAvantAnnee,
  pack: regles.pack,
};

const STATUTS = {
  'à réaliser': 'a_realiser',
  'à refaire': 'a_refaire',
  'déjà valide': 'deja_valide',
  conseillé: 'conseille',
} as const;
const { cas, annee } = lire('__tests__/diagnostic.cases.json') as {
  annee: number;
  cas: {
    contexte: ContexteBien;
    existants: { diagId: string; annee: number }[];
    attendu: {
      resultat: { id: string; statut: keyof typeof STATUTS }[];
      min: number;
      max: number;
      pack: boolean;
    };
  }[];
};

describe('diagnostic : identique à la maquette (300 cas générés)', () => {
  it('même année de référence', () => {
    expect(r.anneeReference).toBe(annee);
  });
  it.each(cas.map((c, i) => [i, c] as const))('cas %i', (_, c) => {
    const res = analyser(c.contexte, c.existants, r);
    expect(res.resultat.map((l) => [l.diagId, l.statut])).toEqual(
      c.attendu.resultat.map((l) => [l.id, STATUTS[l.statut]]),
    );
    expect(res.remisePack).toBe(c.attendu.pack);
    expect(Math.abs(res.minCentimes - c.attendu.min * 100)).toBeLessThanOrEqual(1);
    expect(Math.abs(res.maxCentimes - c.attendu.max * 100)).toBeLessThanOrEqual(1);
  });
});

describe('diagnostic : règles de validité (README)', () => {
  const t = (id: string) => r.obligatoires.find((d) => d.id === id)!;
  it.each([
    ['dpe', 2021, true],
    ['dpe', 2020, false],
    ['dpe', 2016, false],
    ['amiante', 2013, true],
    ['amiante', 2012, false],
    ['termites', 2026, true],
    ['termites', 2025, false],
    ['gaz', 2023, true],
    ['gaz', 2022, false],
    ['plomb', 2025, true],
    ['plomb', 2024, false],
    ['assainissement', 2023, true],
    ['audit', 2021, true],
    ['audit', 2020, false],
    ['carrez', 2000, true],
  ] as const)('%s établi en %i : valable %s', (id, an, valable) => {
    expect(estEncoreValide(t(id), an, r)).toBe(valable);
  });
  it('chaque diagnostic du référentiel a sa règle', () => {
    for (const d of r.obligatoires) expect(REGLES_OBLIGATOIRES[d.id], d.id).toBeTypeOf('function');
    for (const d of r.conseilles) expect(REGLES_CONSEILLEES[d.id], d.id).toBeTypeOf('function');
  });
  it('un diagnostic sans règle est une erreur de référentiel', () => {
    const c = cas[0]!.contexte;
    expect(() =>
      analyser(c, [], {
        ...r,
        obligatoires: [
          ...r.obligatoires,
          { id: 'inconnu', prixMinCentimes: 1, prixMaxCentimes: 2, validiteAns: 1 },
        ],
      }),
    ).toThrow(/inconnu/);
  });
  it('remise pack à partir de 4 diagnostics à réaliser (min × 0,88, max × 0,92)', () => {
    const vente: ContexteBien = {
      motif: 'vente',
      type: 'maison',
      periode: 'av1949',
      gaz: 'oui',
      elec: 'ancienne',
      assainissement: 'individuel',
      classe: 'FG',
      presquile: false,
    };
    const res = analyser(vente, [], r);
    const aFaire = res.resultat.filter((l) => l.statut === 'a_realiser');
    expect(aFaire.length).toBeGreaterThanOrEqual(4);
    expect(res.remisePack).toBe(true);
    expect(res.minCentimes).toBe(
      Math.round(aFaire.reduce((s, l) => s + l.prixMinCentimes, 0) * 0.88),
    );
  });
  it('travaux : aucun diagnostic obligatoire', () => {
    const c: ContexteBien = {
      motif: 'travaux',
      type: 'appartement',
      periode: '1997-2010',
      gaz: 'non',
      elec: 'recente',
      assainissement: 'collectif',
      classe: 'CD',
      presquile: false,
    };
    const res = analyser(c, [], r);
    expect(res.resultat).toEqual([]);
    expect(res.minCentimes).toBe(0);
  });
});
