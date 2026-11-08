import { describe, expect, it } from 'vitest';
import { etapeProjet, etapesAccessibles } from './index';

type Etat = Parameters<typeof etapeProjet>[0];
const p = (statut: Etat['statut'], o: Partial<Omit<Etat, 'statut'>> = {}): Etat => ({
  statut,
  rendu: false,
  ...o,
});

describe('pages d’un projet Studio : Idée › Studio › Publication', () => {
  it('on arrive sur l’étape en cours', () => {
    expect(etapeProjet(p('sujet'))).toBe('idees');
    // Idée choisie : tout le reste (tournage, écrans, montage) se fait dans le Studio.
    for (const s of [
      'enregistrement',
      'transcription',
      'montage',
      'captures',
      'rendu',
      'erreur',
    ] as const)
      expect(etapeProjet(p(s))).toBe('montage');
    expect(etapeProjet(p('pret', { rendu: true }))).toBe('publication');
    // Prête mais sans vidéo finale (ancienne donnée) : on reste au Studio.
    expect(etapeProjet(p('pret'))).toBe('montage');
  });

  it('les étapes suivantes s’ouvrent au fur et à mesure', () => {
    expect(etapesAccessibles(p('sujet'))).toEqual(['idees']);
    expect(etapesAccessibles(p('enregistrement'))).toEqual(['idees', 'montage']);
    expect(etapesAccessibles(p('pret', { rendu: true }))).toEqual([
      'idees',
      'montage',
      'publication',
    ]);
  });

  it('montage libre : directement au Studio, sans idée', () => {
    const libre = p('enregistrement', { libre: true });
    expect(etapeProjet(libre)).toBe('montage');
    expect(etapesAccessibles(libre)).toEqual(['montage']);
    expect(etapeProjet({ ...libre, statut: 'pret', rendu: true })).toBe('publication');
    expect(etapesAccessibles({ ...libre, statut: 'pret', rendu: true })).toEqual([
      'montage',
      'publication',
    ]);
  });
});
