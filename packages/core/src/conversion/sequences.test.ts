import { describe, expect, it } from 'vitest';
import { prochainPas, SEQUENCES_DEFAUT, sequencePourEtape, variante } from './sequences';

const J = 86_400_000;
const seq = {
  etapes: [
    { modele: 'vis-position', declencheur: 'delai' as const, valeur: 3 },
    { modele: 'vis-concurrents', declencheur: 'signal' as const },
    { modele: 'vis-offre-lancement', declencheur: 'delai' as const, valeur: 14, ab: ['a', 'b'] },
  ],
};

describe('moteur de séquences (CONVERSION §9)', () => {
  it('délai depuis l’entrée : attendre, puis envoyer ; les étapes « signal » sont sautées', () => {
    expect(prochainPas(seq, 0, 0, J)).toEqual({ type: 'attendre', le: 3 * J });
    expect(prochainPas(seq, 0, 0, 3 * J)).toEqual({
      type: 'envoyer',
      index: 0,
      modele: 'vis-position',
    });
    expect(prochainPas(seq, 1, 0, 5 * J)).toEqual({ type: 'attendre', le: 14 * J });
    expect(prochainPas(seq, 1, 0, 14 * J)).toMatchObject({
      type: 'envoyer',
      index: 2,
      modele: 'vis-offre-lancement',
    });
    expect(prochainPas(seq, 3, 0, 20 * J)).toEqual({ type: 'fin' });
  });
  it('immédiat', () => {
    expect(
      prochainPas(
        { etapes: [{ modele: 'prospect-estimation', declencheur: 'immediat' }] },
        0,
        5,
        5,
      ),
    ).toEqual({
      type: 'envoyer',
      index: 0,
      modele: 'prospect-estimation',
    });
  });
  it('variante A/B stable par entreprise', () => {
    expect(variante('a1', 'vis-offre-lancement', ['a', 'b'])).toBe(
      variante('a1', 'vis-offre-lancement', ['a', 'b']),
    );
    expect(variante('a1', 'x', undefined)).toBeUndefined();
    const vus = new Set(Array.from({ length: 50 }, (_, i) => variante(`a${i}`, 'm', ['a', 'b'])));
    expect(vus).toEqual(new Set(['a', 'b']));
  });
  it('séquence de chaque étape ; S5 si l’offre cible est Premium', () => {
    expect(sequencePourEtape('prospect', 'visibilite')).toBe('S1');
    expect(sequencePourEtape('gratuit_actif', 'visibilite')).toBe('S4');
    expect(sequencePourEtape('gratuit_actif', 'premium')).toBe('S5');
    expect(sequencePourEtape('visibilite', 'premium')).toBe('S6');
    expect(sequencePourEtape('premium', 'premium')).toBe('S7');
    expect(sequencePourEtape('resiliation_demandee', 'premium')).toBe('S8');
    expect(sequencePourEtape('ancien_client', 'premium')).toBe('S9');
    expect(sequencePourEtape('compte_cree', 'premium')).toBeNull();
  });
  it('séquences par défaut : modèles du catalogue, étape d’entrée cohérente', () => {
    for (const [id, s] of Object.entries(SEQUENCES_DEFAUT)) {
      expect(s.etapes.length, id).toBeGreaterThan(0);
      if (id !== 'S5')
        expect(sequencePourEtape(s.etapeEntree, id === 'S4' ? 'visibilite' : 'premium')).toBe(id);
    }
  });
});
