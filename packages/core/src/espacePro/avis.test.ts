import { describe, expect, it } from 'vitest';
import { filtrerAvisPro, resumeAvisPro } from './avis';

const J = 86_400_000;
const T = Date.UTC(2026, 8, 29);
const a = (note: number, jours: number, reponse = false) => ({
  note,
  publieLe: T - jours * J,
  ...(reponse ? { reponse: { texte: 'Merci' } } : {}),
});

describe('resumeAvisPro (maquette Mes Avis)', () => {
  it('moyenne, total, positifs (4 et 5), récents (30 jours), répartition', () => {
    const r = resumeAvisPro([a(5, 1), a(4, 10), a(2, 40), a(5, 100)], T);
    expect(r).toEqual({
      moyenne: 4,
      total: 4,
      partPositifs: 0.75,
      recents: 2,
      repartition: [
        { note: 5, nombre: 2 },
        { note: 4, nombre: 1 },
        { note: 3, nombre: 0 },
        { note: 2, nombre: 1 },
        { note: 1, nombre: 0 },
      ],
    });
  });

  it('aucun avis : zéros', () => {
    expect(resumeAvisPro([], T)).toMatchObject({
      moyenne: 0,
      total: 0,
      partPositifs: 0,
      recents: 0,
    });
  });
});

describe('filtrerAvisPro', () => {
  const liste = [a(5, 1), a(3, 2, true), a(4, 3, true)];
  it('tous, positifs, sans réponse', () => {
    expect(filtrerAvisPro(liste, 'tous')).toHaveLength(3);
    expect(filtrerAvisPro(liste, 'positifs')).toHaveLength(2);
    expect(filtrerAvisPro(liste, 'sans_reponse')).toEqual([liste[0]]);
  });
});
