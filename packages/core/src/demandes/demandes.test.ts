import { describe, expect, it } from 'vitest';
import { entreeDemande } from '../schemas';
import type { Champ } from '../simulateur';
import {
  champDepuisDocument,
  expirationDemande,
  referenceDemande,
  referentielDepuisDocuments,
  verifierReponses,
} from './index';

const champs: Champ[] = [
  {
    id: 'q',
    kind: 'slider',
    label: 'Surface',
    aide: '',
    min: 2,
    max: 20,
    def: 6,
    unite: 'm²',
    e: 2,
  },
  {
    id: 'gamme',
    kind: 'options',
    label: 'Gamme',
    aide: '',
    options: [
      { v: 'eco', label: 'Économique' },
      { v: 'std', label: 'Standard' },
    ],
    e: 2,
  },
  {
    id: 'extras',
    kind: 'chips',
    label: 'Options',
    aide: '',
    options: [
      { v: 'wc', label: 'WC suspendu' },
      { v: 'seche', label: 'Sèche-serviettes' },
    ],
    e: 3,
  },
];

describe('referenceDemande', () => {
  it('PH- suivi de 6 caractères sans ambiguïté (ni 0, ni O, ni 1, ni I)', () => {
    expect(referenceDemande(() => 0)).toBe('PH-222222');
    expect(referenceDemande(() => 0.999)).toBe('PH-ZZZZZZ');
    let i = 0;
    const r = referenceDemande(() => (i++ % 32) / 32);
    expect(r).toMatch(/^PH-[2-9A-HJ-NP-Z]{6}$/);
  });
});

describe('verifierReponses', () => {
  it('réponses valides : conservées, résumé lisible dans l’ordre des champs, clés inconnues ignorées', () => {
    const r = verifierReponses(champs, { q: 8, gamme: 'std', extras: ['wc'], inconnu: 'x' });
    expect(r.invalides).toEqual([]);
    expect(r.reponses).toEqual({ q: 8, gamme: 'std', extras: ['wc'] });
    expect(r.lisibles).toEqual([
      { question: 'Surface', reponse: '8 m²' },
      { question: 'Gamme', reponse: 'Standard' },
      { question: 'Options', reponse: 'WC suspendu' },
    ]);
  });
  it('hors bornes, option inconnue ou réponse manquante : signalées', () => {
    expect(verifierReponses(champs, { q: 99, gamme: 'luxe' }).invalides).toEqual([
      'q',
      'gamme',
      'extras',
    ]);
  });
  it('chips vides acceptées ; options vides non affichées dans le résumé', () => {
    const r = verifierReponses(champs, { q: 6, gamme: 'eco', extras: [] });
    expect(r.invalides).toEqual([]);
    expect(r.lisibles.map((l) => l.question)).toEqual(['Surface', 'Gamme']);
  });
});

describe('champDepuisDocument', () => {
  it('forme publique Firestore → champ du simulateur', () => {
    expect(
      champDepuisDocument({
        id: 'q',
        kind: 'stepper',
        label: 'Nombre',
        min: 1,
        max: 10,
        def: 1,
        unite: 'u',
        etape: 2,
      }),
    ).toEqual({
      id: 'q',
      kind: 'stepper',
      label: 'Nombre',
      aide: '',
      min: 1,
      max: 10,
      def: 1,
      unite: 'u',
      e: 2,
    });
    expect(
      champDepuisDocument({
        id: 'g',
        kind: 'options',
        label: 'G',
        aide: 'a',
        etape: 3,
        options: [{ v: 'x', label: 'X', desc: 'd' }],
      }),
    ).toEqual({
      id: 'g',
      kind: 'options',
      label: 'G',
      aide: 'a',
      e: 3,
      options: [{ v: 'x', label: 'X', desc: 'd' }],
    });
  });
});

describe('referentielDepuisDocuments', () => {
  const coefficients = {
    regions: [],
    autreDepartement: { coef: 1, note: '' },
    sansCodePostal: { coef: 1, note: '' },
    acces: { facile: 1, etage: 1.06, difficile: 1.12 },
  };
  it('prestation détaillée : paramètres rangés sous `detailles`', () => {
    const r = referentielDepuisDocuments({
      prestationId: 'sdb',
      formule: 'detaillee:sdb',
      parametres: { gammes: {} },
      coefficients,
      version: '2026-09',
    });
    expect(r.detailles.sdb).toEqual({ gammes: {} });
    expect(r.version).toBe('2026-09');
  });
  it('prestation du catalogue : tarif converti et TVA', () => {
    const r = referentielDepuisDocuments({
      prestationId: 'portail',
      formule: 'generique',
      parametres: {
        tarif: {
          lib: 'Portail',
          unitaire: [100, 200],
          base: [0, 0],
          evac: [0, 0],
          choix: [],
          extras: [{ v: 'motor', label: 'Motorisation', min: 10, max: 20 }],
        },
        tva: 20,
      },
      coefficients,
      version: '2026-09',
    });
    expect(r.catalogue.portail?.extras).toEqual([['motor', 'Motorisation', 10, 20]]);
    expect(r.tvaCatalogue.portail).toBe(20);
  });
});

describe('expirationDemande', () => {
  it('3 ans après la création (DATABASE §15)', () => {
    const t = Date.UTC(2026, 8, 28);
    expect(expirationDemande(t).getTime()).toBe(t + 3 * 365 * 86_400_000);
  });
});

describe('entreeDemande', () => {
  const base = {
    cleIdempotence: 'cle-demande-0001',
    source: 'simulateur',
    prestationId: 'sdb',
    reponses: { q: 6, gamme: 'std', extras: [] },
    codePostal: '33000',
    acces: 'facile',
    contact: {
      prenom: ' Camille ',
      nom: 'Martin',
      email: 'Camille@Test.local',
      telephone: '06 12 34 56 78',
    },
    miseEnRelation: true,
    accepteConfidentialite: true,
  };
  it('normalise l’email et le téléphone, délai « asap » par défaut', () => {
    const e = entreeDemande.parse(base);
    expect(e.contact).toEqual({
      prenom: 'Camille',
      nom: 'Martin',
      email: 'camille@test.local',
      telephone: '+33612345678',
    });
    expect(e.delaiSouhaite).toBe('asap');
  });
  it('SIM-08 : tout montant envoyé par le navigateur est refusé', () => {
    expect(entreeDemande.safeParse({ ...base, estimation: { minCentimes: 1 } }).success).toBe(
      false,
    );
    expect(entreeDemande.safeParse({ ...base, prixCentimes: 1 }).success).toBe(false);
  });
  it('confidentialité obligatoire, téléphone invalide refusé, piège à robots', () => {
    expect(entreeDemande.safeParse({ ...base, accepteConfidentialite: false }).success).toBe(false);
    expect(
      entreeDemande.safeParse({ ...base, contact: { ...base.contact, telephone: '12' } }).success,
    ).toBe(false);
    expect(entreeDemande.safeParse({ ...base, site: 'http://x' }).success).toBe(false);
  });
});
