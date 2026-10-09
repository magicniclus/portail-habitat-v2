import { describe, expect, it } from 'vitest';
import { messageRapportHebdo, rapportHebdo } from './rapportHebdo';

// Lundi 12 octobre 2026 : semaine du 5 au 11, précédente du 28 septembre au 4 octobre.
const T = Date.UTC(2026, 9, 12, 6);
const jour = (j: string, v: number, t = 0, d = 0, r = 0) => ({
  jour: j,
  vuesFiche: v,
  clicsTelephone: t,
  clicsDevis: d,
  demandesRecues: r,
});

describe('rapport hebdomadaire (EMAILS rapport-hebdo)', () => {
  it('semaine passée et semaine d’avant, lundi exclu', () => {
    const r = rapportHebdo(
      [
        jour('2026-10-05', 10, 1, 1, 1),
        jour('2026-10-11', 5, 1, 0, 1),
        jour('2026-10-12', 99),
        jour('2026-10-01', 8, 0, 1, 0),
        jour('2026-09-20', 50),
      ],
      T,
    );
    expect(r).toEqual({
      semaine: { vues: 15, clics: 3, demandes: 2 },
      precedente: { vues: 8, clics: 1, demandes: 0 },
    });
  });
  it('message : chiffres et évolution ; rien à signaler sans activité', () => {
    const r = rapportHebdo([jour('2026-10-06', 15, 2, 1, 2), jour('2026-10-01', 10)], T)!;
    expect(messageRapportHebdo(r)).toBe(
      'Cette semaine : 15 vues de votre fiche (+5), 3 clics (+3), 2 demandes reçues (+2).',
    );
    expect(rapportHebdo([jour('2026-09-01', 4)], T)).toBeNull();
  });
});
