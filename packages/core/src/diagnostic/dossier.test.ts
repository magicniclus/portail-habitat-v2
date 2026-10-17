import { describe, expect, it } from 'vitest';
import { entreeDossierDiag } from '../schemas';
import type { LigneDossier, ReferentielDiagnostic } from './analyser';
import { lignesPubliques, referenceDossier, referentielSansPrix, resumeDossier } from './dossier';

const textes = {
  dpe: {
    nom: 'DPE',
    quand: 'Obligatoire pour toute vente',
    validite: '10 ans',
    note: 'Un DPE établi avant le 1er juillet 2021 n’est plus valable.',
  },
  erp: { nom: 'ERP', quand: 'Vente et location', validite: '6 mois', note: '' },
  merule: { nom: 'Mérule (conseillé)', raison: 'Bâti ancien humide.' },
};
const ligne = (diagId: string, statut: LigneDossier['statut']): LigneDossier => ({
  diagId,
  statut,
  prixMinCentimes: 11_000,
  prixMaxCentimes: 19_000,
});

describe('lignesPubliques (maquette Parcours Diagnostic, sans prix)', () => {
  it('raisons selon le statut, aucun montant', () => {
    const l = lignesPubliques(
      [ligne('dpe', 'a_refaire'), ligne('erp', 'a_realiser'), ligne('merule', 'conseille')],
      textes,
      [{ diagId: 'dpe', annee: 2019 }],
    );
    expect(l).toEqual([
      {
        diagId: 'dpe',
        nom: 'DPE',
        statut: 'a_refaire',
        raison:
          'Rapport de 2019 hors délai. Obligatoire pour toute vente. Un DPE établi avant le 1er juillet 2021 n’est plus valable.',
      },
      {
        diagId: 'erp',
        nom: 'ERP',
        statut: 'a_realiser',
        raison: 'Vente et location. Validité : 6 mois.',
      },
      {
        diagId: 'merule',
        nom: 'Mérule (conseillé)',
        statut: 'conseille',
        raison: 'Bâti ancien humide.',
      },
    ]);
    expect(JSON.stringify(l)).not.toMatch(/Centimes|€/);
  });
  it('rapport encore valable', () => {
    expect(
      lignesPubliques([ligne('dpe', 'deja_valide')], textes, [{ diagId: 'dpe', annee: 2023 }])[0]!
        .raison,
    ).toBe('Votre rapport de 2023 reste valable : inutile de le refaire.');
  });
});

describe('resumeDossier', () => {
  it('compte les diagnostics à réaliser et les rapports réutilisés', () => {
    expect(
      resumeDossier([
        ligne('dpe', 'a_refaire'),
        ligne('erp', 'a_realiser'),
        ligne('gaz', 'deja_valide'),
        ligne('merule', 'conseille'),
      ]),
    ).toEqual({ aRealiser: 2, reutilises: 1, titre: '2 diagnostics à réaliser' });
    expect(resumeDossier([ligne('gaz', 'deja_valide')]).titre).toBe('Aucun diagnostic à refaire');
    expect(resumeDossier([ligne('erp', 'a_realiser')]).titre).toBe('1 diagnostic à réaliser');
  });
});

describe('referentielSansPrix', () => {
  it('garde règles et validités, met tous les prix à zéro (envoyable au navigateur, DIA-06)', () => {
    const r: ReferentielDiagnostic = {
      version: '2026-01',
      anneeReference: 2026,
      obligatoires: [
        { id: 'dpe', prixMinCentimes: 11_000, prixMaxCentimes: 19_000, validiteAns: 10 },
      ],
      conseilles: [
        { id: 'merule', prixMinCentimes: 12_000, prixMaxCentimes: 22_000, validiteAns: 0 },
      ],
      invalideAvantAnnee: { dpe: 2021 },
      pack: { seuil: 4, coefMin: 0.88, coefMax: 0.92 },
    };
    const p = referentielSansPrix(r);
    expect(p.obligatoires).toEqual([
      { id: 'dpe', prixMinCentimes: 0, prixMaxCentimes: 0, validiteAns: 10 },
    ]);
    expect(p.pack).toEqual({ seuil: 4, coefMin: 1, coefMax: 1 });
    expect(JSON.stringify(p)).not.toMatch(/11000|19000|0\.88/);
  });
});

describe('referenceDossier', () => {
  it('PHD- suivi de 6 caractères', () => {
    expect(referenceDossier(() => 0)).toBe('PHD-222222');
  });
});

describe('entreeDossierDiag', () => {
  const base = {
    cleIdempotence: 'cle-diag-00001',
    bien: {
      adresse: '12 rue Camille Pelletan',
      communeSlug: 'cenon',
      codePostal: '33150',
      type: 'maison',
      periode: '1949-1976',
      surface: 110,
      motif: 'vente',
      gaz: 'oui',
      elec: 'ancienne',
      assainissement: 'collectif',
      classe: 'inconnu',
    },
    existants: [{ diagId: 'dpe', annee: 2019 }],
    contact: { nom: 'Camille Martin', email: 'camille@test.local', telephone: '06 12 34 56 78' },
    visiteSouhaitee: 'semaine',
    accepteContact: true,
  };
  it('valide et normalise le téléphone', () => {
    expect(entreeDossierDiag.parse(base).contact.telephone).toBe('+33612345678');
  });
  it('DIA-06 : aucun montant accepté ; contact obligatoire', () => {
    expect(entreeDossierDiag.safeParse({ ...base, estimation: { min: 1 } }).success).toBe(false);
    expect(entreeDossierDiag.safeParse({ ...base, accepteContact: false }).success).toBe(false);
  });
});
