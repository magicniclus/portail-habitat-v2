import { describe, expect, it } from 'vitest';
import { etapeProjet, etapesAccessibles, type EtapeProjet } from './index';

type Etat = Parameters<typeof etapeProjet>[0];
const p = (statut: Etat['statut'], o: Partial<Omit<Etat, 'statut'>> = {}): Etat => ({
  statut,
  prise: false,
  rendu: false,
  captures: 'filmee',
  ...o,
});

describe('pages d’un projet Studio', () => {
  it('on arrive sur l’étape en cours', () => {
    expect(etapeProjet(p('sujet', { captures: 'a_preparer' }))).toBe('idees');
    // Idée choisie : d'abord les captures (artisan d'exemple et écrans), puis le tournage.
    expect(etapeProjet(p('enregistrement', { captures: 'a_preparer' }))).toBe('captures');
    expect(etapeProjet(p('enregistrement', { captures: 'preparee' }))).toBe('captures');
    expect(etapeProjet(p('captures', { captures: 'preparee' }))).toBe('captures');
    expect(etapeProjet(p('erreur', { captures: 'preparee' }))).toBe('captures');
    expect(etapeProjet(p('enregistrement', { captures: 'filmee' }))).toBe('tournage');
    expect(etapeProjet(p('enregistrement', { captures: 'ignoree' }))).toBe('tournage');
    for (const s of ['transcription', 'montage', 'captures', 'rendu', 'erreur'] as const)
      expect(etapeProjet(p(s, { prise: true }))).toBe('montage');
    expect(etapeProjet(p('pret', { prise: true, rendu: true }))).toBe('publication');
    // Prête mais sans vidéo finale (ancienne donnée) : on reste au montage.
    expect(etapeProjet(p('pret', { prise: true }))).toBe('montage');
  });

  it('les étapes suivantes s’ouvrent au fur et à mesure', () => {
    const toutes: EtapeProjet[] = ['idees', 'captures', 'tournage', 'montage', 'publication'];
    expect(etapesAccessibles(p('sujet'))).toEqual(['idees']);
    expect(etapesAccessibles(p('enregistrement'))).toEqual(toutes.slice(0, 3));
    expect(etapesAccessibles(p('montage', { prise: true }))).toEqual(toutes.slice(0, 4));
    expect(etapesAccessibles(p('pret', { prise: true, rendu: true }))).toEqual(toutes);
  });

  it('montage libre : directement au montage, sans idée, captures ni tournage', () => {
    const libre = p('enregistrement', { captures: 'a_preparer', libre: true });
    expect(etapeProjet(libre)).toBe('montage');
    expect(etapesAccessibles(libre)).toEqual(['montage']);
    expect(etapeProjet({ ...libre, statut: 'pret', rendu: true })).toBe('publication');
    expect(etapesAccessibles({ ...libre, statut: 'pret', rendu: true })).toEqual([
      'montage',
      'publication',
    ]);
  });
});
