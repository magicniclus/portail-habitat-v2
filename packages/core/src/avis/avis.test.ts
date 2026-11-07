import { describe, expect, it } from 'vitest';
import { entreeAvis } from '../schemas';
import { finChantierValide, texteUniciteAvis } from './index';

describe('finChantierValide', () => {
  const t = new Date(Date.UTC(2026, 8, 28));
  it('mois passé ou courant, 3 ans au plus', () => {
    expect(finChantierValide('2026-09', t)).toBe(true);
    expect(finChantierValide('2023-09', t)).toBe(true);
    expect(finChantierValide('2026-10', t)).toBe(false);
    expect(finChantierValide('2023-08', t)).toBe(false);
    expect(finChantierValide('n-importe', t)).toBe(false);
  });
});

describe('texteUniciteAvis', () => {
  it('insensible à la casse de l’email', () => {
    expect(texteUniciteAvis(' Camille@Test.local', 'a1', '2026-05')).toBe(
      texteUniciteAvis('camille@test.local', 'a1', '2026-05'),
    );
  });
});

describe('entreeAvis', () => {
  const base = {
    cleIdempotence: 'cle-avis-00001',
    artisanId: 'a1',
    note: 5,
    criteres: { qualite: 5, delais: 4 },
    pointsPositifs: ['Devis clair', 'Ponctuel'],
    texte: 'Chantier tenu en 5 jours.',
    nomAffiche: 'Camille M.',
    email: 'camille@test.local',
    typeTravaux: 'Salle de bain',
    finChantier: '2026-05',
    certification: true,
  };
  it('avis complet accepté', () => {
    expect(entreeAvis.parse(base).note).toBe(5);
  });
  it('AVI-01 : note et certification obligatoires', () => {
    expect(entreeAvis.safeParse({ ...base, note: 0 }).success).toBe(false);
    expect(entreeAvis.safeParse({ ...base, certification: false }).success).toBe(false);
  });
  it('AVI-02 : 1 200 caractères au plus', () => {
    expect(entreeAvis.safeParse({ ...base, texte: 'x'.repeat(1200) }).success).toBe(true);
    expect(entreeAvis.safeParse({ ...base, texte: 'x'.repeat(1201) }).success).toBe(false);
  });
  it('points et types hors liste refusés, aucune clé inconnue', () => {
    expect(entreeAvis.safeParse({ ...base, pointsPositifs: ['Génial'] }).success).toBe(false);
    expect(entreeAvis.safeParse({ ...base, typeTravaux: 'Piscine' }).success).toBe(false);
    expect(entreeAvis.safeParse({ ...base, statut: 'publie' }).success).toBe(false);
  });
});
