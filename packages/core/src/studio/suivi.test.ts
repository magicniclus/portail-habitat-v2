import { describe, expect, it } from 'vitest';
import { ETAPES_SUIVI, etapeBloquee, etapesFabrication } from './index';

describe('suivi de la fabrication', () => {
  it('la transcription n’apparaît que pour une voix enregistrée', () => {
    expect(etapesFabrication('pabc')).toEqual([
      'transcription',
      'montage',
      'captures',
      'rendu',
      'pret',
    ]);
    // Voix IA (mots déjà horodatés) et « Claude fait tout » : pas de transcription.
    expect(etapesFabrication('vabc')).toEqual(['montage', 'captures', 'rendu', 'pret']);
    expect(etapesFabrication('mabc')).toEqual(['montage', 'captures', 'rendu', 'pret']);
  });

  it('chaque étape dit ce qui se passe et combien de temps ça prend d’habitude', () => {
    for (const e of ['transcription', 'montage', 'captures', 'rendu'] as const) {
      expect(ETAPES_SUIVI[e].explication.length).toBeGreaterThan(20);
      expect(ETAPES_SUIVI[e].habituel).toMatch(/min/);
    }
    // L'ordre se comprend : les captures suivent le montage, qui choisit les écrans.
    expect(ETAPES_SUIVI.montage.explication).toContain('écrans');
  });

  it('une étape est bloquée quand elle dépasse sa durée maximale', () => {
    const t0 = 1_000_000;
    expect(etapeBloquee('montage', t0, t0 + 60_000)).toBe(false);
    expect(etapeBloquee('montage', t0, t0 + ETAPES_SUIVI.montage.maxMs + 1)).toBe(true);
    // Hors fabrication, rien n'est « bloqué ».
    expect(etapeBloquee('pret', t0, t0 + 1e9)).toBe(false);
    expect(etapeBloquee('erreur', t0, t0 + 1e9)).toBe(false);
  });
});
