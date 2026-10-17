import { describe, expect, it } from 'vitest';
import { controlerRedaction, promptRedaction, sortieRedaction, statsRedaction } from './redaction';

describe('controlerRedaction', () => {
  const e = { type: 'apropos' as const, texte: 'Plombier à Bordeaux depuis longtemps.' };

  it('accepte une proposition sans certification inventée', () => {
    expect(controlerRedaction('Plombier à Bordeaux, devis gratuit.', e, [])).toEqual([]);
  });

  it('refuse une certification absente des labels vérifiés', () => {
    expect(controlerRedaction('Artisan certifié RGE.', e, ['decennale'])).toEqual([
      'certification non vérifiée sur la fiche : rge',
    ]);
    expect(controlerRedaction('Artisan certifié RGE.', e, ['rge'])).toEqual([]);
  });

  it('laisse une certification que l’artisan avait déjà écrite', () => {
    expect(
      controlerRedaction('Qualibat depuis 2010.', { ...e, texte: 'Nous sommes Qualibat.' }, []),
    ).toEqual([]);
  });

  it('borne la longueur selon le type', () => {
    expect(controlerRedaction('x'.repeat(401), { type: 'projet', texte: '' }, [])[0]).toContain(
      '401 caractères',
    );
  });
});

describe('promptRedaction', () => {
  it('donne les infos de la fiche, le ton et la consigne, sans rien inventer', () => {
    const p = promptRedaction(
      { type: 'apropos', action: 'reecrire', ton: 'chaleureux', texte: 'Bonjour.' },
      { nom: 'Martin Plomberie', metiers: ['Plombier'], ville: 'Bordeaux', labels: [] },
    );
    expect(p.systeme).toContain('n’invente aucun fait');
    expect(p.demande).toContain('Ton demandé : Plus chaleureux.');
    expect(p.contexte).toContain('labels vérifiés : aucun');
    const g = promptRedaction(
      { type: 'projet', action: 'generer', texte: '', infos: { titre: 'Salle de bain' } },
      { nom: 'X', metiers: [], ville: '', labels: ['rge'] },
    );
    expect(g.demande).toContain('"titre":"Salle de bain"');
    expect(g.demande).toContain('(vide)');
    expect(g.contexte).toContain('non précisés');
  });

  it('valide la sortie', () => {
    expect(sortieRedaction.parse({ texte: 'Bonjour.' }).changements).toEqual([]);
  });
});

describe('usage de l’aide à la rédaction (Admin › IA)', () => {
  it('taux d’acceptation global et par action, coût total', () => {
    const r = statsRedaction([
      { action: 'relire', accepte: true, coutCentimes: 1 },
      { action: 'relire', accepte: false, coutCentimes: 1 },
      { action: 'reecrire', accepte: true, coutCentimes: 2 },
      { action: 'generer', accepte: true, coutCentimes: 3 },
    ]);
    expect(r).toEqual({
      total: 4,
      acceptees: 3,
      tauxAcceptation: 75,
      coutCentimes: 7,
      parAction: {
        relire: { total: 2, acceptees: 1 },
        reecrire: { total: 1, acceptees: 1 },
        generer: { total: 1, acceptees: 1 },
      },
    });
  });
  it('aucune utilisation : taux nul, sans division par zéro', () => {
    expect(statsRedaction([])).toMatchObject({ total: 0, tauxAcceptation: null });
  });
});
