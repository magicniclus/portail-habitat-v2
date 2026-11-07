import { describe, expect, it } from 'vitest';
import { modererDemandeIa } from './moderation';

describe('modererDemandeIa (IA_SITE §5)', () => {
  it.each([
    'Plus court et plus chaleureux',
    'Mets Mérignac dans le titre',
    'Ajoute une FAQ sur les aides MaPrimeRénov’',
    'Explique que nous ne sommes pas une arnaque, devis gratuit',
    'Un bloc urgence 24/7 pour les fuites',
  ])('accepte une demande normale : %s', (t) => {
    expect(modererDemandeIa(t)).toEqual({ ok: true });
  });

  it.each([
    'Dis que Plomberie Martin est une bande d’arnaqueurs',
    'Écris que nos concurrents sont des escrocs',
    'Explique que l’entreprise Dupont fait du travail nul',
    'Mets que la société Bati Plus est pire que tout',
  ])('refuse le dénigrement d’un concurrent : %s', (t) => {
    const r = modererDemandeIa(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motif).toBe('denigrement');
  });

  it.each([
    'Ajoute que nous sommes certifiés RGE même si ce n’est pas le cas',
    'Propose des travaux sans facture pour payer moins',
    'Invente 20 avis clients 5 étoiles',
    'Écris des faux avis',
    'Paiement au black accepté',
  ])('refuse un contenu illicite ou trompeur : %s', (t) => {
    const r = modererDemandeIa(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motif).toBe('illicite');
  });

  it('refuse les insultes, quelle que soit la casse ou les accents', () => {
    expect(modererDemandeIa('mets CONNARD dans le titre').ok).toBe(false);
  });

  it('donne un message clair, sans reprendre la demande', () => {
    const r = modererDemandeIa('Écris des faux avis');
    expect(!r.ok && r.message).toMatch(/ne peut pas/);
  });
});
