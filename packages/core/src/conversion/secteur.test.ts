import { describe, expect, it } from 'vitest';
import { classerSecteurs, signauxDeclenches } from './secteur';

const a = (id: string, misEnAvant: boolean, score: number, vues7j: number, ville = 'Bordeaux') => ({
  id,
  metier: 'plombier',
  ville,
  misEnAvant,
  score,
  vues7j,
});

describe('position dans le secteur (CONVERSION §6)', () => {
  it('mises en avant d’abord, puis score ; vues moyennes des fiches mises en avant', () => {
    const r = classerSecteurs([
      a('g1', false, 90, 10),
      a('v1', true, 50, 300),
      a('g2', false, 70, 5),
      a('v2', true, 60, 100),
      a('x', false, 99, 1, 'Pessac'),
    ]);
    expect(r.get('v2')).toEqual({ position: 1, total: 4, misesEnAvant: 2, vuesMisesEnAvant: 200 });
    expect(r.get('g1')).toMatchObject({ position: 3, total: 4 });
    expect(r.get('g2')).toMatchObject({ position: 4 });
    expect(r.get('x')).toEqual({ position: 1, total: 1, misesEnAvant: 0, vuesMisesEnAvant: 0 });
  });
});

describe('signaux (CONVERSION §3 S4)', () => {
  const avant = { position: 14, misesEnAvant: 2 };
  it('un concurrent passe en avant et la fiche recule : vis-concurrents, au plus toutes les 3 semaines', () => {
    expect(
      signauxDeclenches(
        'gratuit_actif',
        avant,
        { position: 15, misesEnAvant: 3 },
        { maintenant: 100 },
      ),
    ).toEqual([{ modele: 'vis-concurrents', recul: 1 }]);
    expect(
      signauxDeclenches(
        'gratuit_actif',
        avant,
        { position: 15, misesEnAvant: 3 },
        { maintenant: 100, dernier: { 'vis-concurrents': 100 - 10 * 86_400_000 } },
      ),
    ).toEqual([]);
    expect(
      signauxDeclenches(
        'gratuit_actif',
        avant,
        { position: 14, misesEnAvant: 3 },
        { maintenant: 100 },
      ),
    ).toEqual([]);
    expect(
      signauxDeclenches(
        'visibilite',
        avant,
        { position: 15, misesEnAvant: 3 },
        { maintenant: 100 },
      ),
    ).toEqual([]);
    expect(
      signauxDeclenches(
        'gratuit_actif',
        {},
        { position: 15, misesEnAvant: 3 },
        { maintenant: 100 },
      ),
    ).toEqual([]);
  });
});
