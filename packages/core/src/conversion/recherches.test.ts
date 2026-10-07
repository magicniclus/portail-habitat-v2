import { describe, expect, it } from 'vitest';
import {
  type CompteurRecherches,
  estRobot,
  idRechercheSecteur,
  idsPremierePage,
  PREMIERE_PAGE,
  recherchesDuSecteur,
  signalRecherchesManquees,
} from './recherches';

const J = 86_400_000;
const T = Date.UTC(2026, 9, 1, 5);

describe('recherches de l’annuaire par secteur (CONVERSION §3 S4)', () => {
  it('identifiant du compteur : jour, métier, ville sans accent', () => {
    expect(idRechercheSecteur('2026-10-01', 'plombier', 'Mérignac')).toBe(
      '2026-10-01_plombier_merignac',
    );
  });
  it('1re page : à la une puis les autres, 10 fiches', () => {
    const f = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `a${i}` }));
    const ids = idsPremierePage({ premium: [{ id: 'p' }], standards: f(15) });
    expect(ids).toHaveLength(PREMIERE_PAGE);
    expect(ids[0]).toBe('p');
  });
  it('recherches du secteur et apparitions de la fiche en 1re page', () => {
    const docs: CompteurRecherches[] = [
      { jour: '2026-09-30', metier: 'plombier', ville: 'Mérignac', n: 8, premierePage: { a: 2 } },
      { jour: '2026-09-25', metier: 'plombier', ville: 'merignac', n: 6, premierePage: {} },
      { jour: '2026-09-20', metier: 'plombier', ville: 'Mérignac', n: 50, premierePage: {} },
      { jour: '2026-09-30', metier: 'electricien', ville: 'Mérignac', n: 9, premierePage: {} },
      { jour: '2026-09-30', metier: 'plombier', ville: 'Pessac', n: 9, premierePage: {} },
    ];
    const r = recherchesDuSecteur(docs, { id: 'a', metier: 'plombier', ville: 'MERIGNAC' }, T);
    expect(r).toEqual({ recherches7j: 14, manquees7j: 12, recherches30j: 64 });
  });
  it('signal : 10 recherches manquées en 7 jours, gratuit en ligne, au plus tous les 14 jours', () => {
    expect(signalRecherchesManquees('gratuit_actif', 10, { maintenant: T })).toBe(true);
    expect(signalRecherchesManquees('gratuit_actif', 9, { maintenant: T })).toBe(false);
    expect(signalRecherchesManquees('visibilite', 30, { maintenant: T })).toBe(false);
    expect(
      signalRecherchesManquees('gratuit_actif', 30, { maintenant: T, dernier: T - 13 * J }),
    ).toBe(false);
    expect(
      signalRecherchesManquees('gratuit_actif', 30, { maintenant: T, dernier: T - 14 * J }),
    ).toBe(true);
  });
  it('robots et aperçus ne comptent pas', () => {
    expect(estRobot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(estRobot('Mozilla/5.0 HeadlessChrome/120')).toBe(true);
    expect(estRobot('')).toBe(true);
    expect(estRobot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1')).toBe(false);
  });
});
