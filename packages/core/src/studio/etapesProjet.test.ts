import { describe, expect, it } from 'vitest';
import { etapeProjet, etapesAccessibles } from './index';

const p = (
  statut: Parameters<typeof etapeProjet>[0]['statut'],
  o: { prise?: boolean; rendu?: boolean } = {},
) => ({
  statut,
  prise: o.prise ?? false,
  rendu: o.rendu ?? false,
});

describe('pages d’un projet Studio', () => {
  it('on arrive sur l’étape en cours', () => {
    expect(etapeProjet(p('sujet'))).toBe('idees');
    expect(etapeProjet(p('enregistrement'))).toBe('tournage');
    for (const s of ['transcription', 'montage', 'captures', 'rendu', 'erreur'] as const)
      expect(etapeProjet(p(s, { prise: true }))).toBe('montage');
    expect(etapeProjet(p('pret', { prise: true, rendu: true }))).toBe('publication');
    // Prête mais sans vidéo finale (ancienne donnée) : on reste au montage.
    expect(etapeProjet(p('pret', { prise: true }))).toBe('montage');
  });

  it('les étapes suivantes s’ouvrent au fur et à mesure', () => {
    expect(etapesAccessibles(p('sujet'))).toEqual(['idees']);
    expect(etapesAccessibles(p('enregistrement'))).toEqual(['idees', 'tournage']);
    expect(etapesAccessibles(p('montage', { prise: true }))).toEqual([
      'idees',
      'tournage',
      'montage',
    ]);
    expect(etapesAccessibles(p('pret', { prise: true, rendu: true }))).toEqual([
      'idees',
      'tournage',
      'montage',
      'publication',
    ]);
  });
});
