import { describe, expect, it } from 'vitest';
import {
  abscisseReference,
  appareilPour,
  cleCellule,
  estRobot,
  palierProfondeur,
  visiteRetenue,
} from './mesure';

describe('mesure du comportement', () => {
  it('classe la largeur de fenêtre par gabarit', () => {
    expect(appareilPour(1440)).toBe('ordinateur');
    expect(appareilPour(1200)).toBe('ordinateur');
    expect(appareilPour(1199)).toBe('tablette');
    expect(appareilPour(768)).toBe('tablette');
    expect(appareilPour(390)).toBe('mobile');
  });

  it('ramène x à la mise en page de référence, quelle que soit la largeur réelle', () => {
    expect(abscisseReference(720, 1440, 'ordinateur')).toBe(640);
    expect(abscisseReference(640, 1280, 'ordinateur')).toBe(640);
    expect(abscisseReference(195, 390, 'mobile')).toBe(195);
    expect(abscisseReference(5000, 1440, 'ordinateur')).toBe(1279);
    expect(abscisseReference(-10, 1440, 'ordinateur')).toBe(0);
    expect(abscisseReference(10, 0, 'mobile')).toBe(0);
  });

  it('forme une clé de cellule de 20 px', () => {
    expect(cleCellule(0, 0)).toBe('0:0');
    expect(cleCellule(639, 41)).toBe('31:2');
    expect(cleCellule(10, -5)).toBe('0:0');
  });

  it('arrondit la profondeur au palier de 5 % inférieur', () => {
    expect(palierProfondeur(900, 3000)).toBe(30);
    expect(palierProfondeur(1049, 1500)).toBe(65);
    expect(palierProfondeur(4000, 3000)).toBe(100);
    expect(palierProfondeur(-1, 3000)).toBe(0);
    expect(palierProfondeur(10, 0)).toBe(100);
  });
});

describe('tri des visites côté serveur', () => {
  it('garde toutes les sessions à 100 %, aucune à 0 %', () => {
    expect(visiteRetenue('abc', 1)).toBe(true);
    expect(visiteRetenue('abc', 0)).toBe(false);
  });

  it('retient environ la part demandée, toujours la même décision pour une session', () => {
    const ids = Array.from({ length: 4000 }, (_, i) => `s${i.toString(36)}x`);
    const gardees = ids.filter((id) => visiteRetenue(id, 0.25)).length;
    expect(gardees / ids.length).toBeGreaterThan(0.22);
    expect(gardees / ids.length).toBeLessThan(0.28);
    expect(visiteRetenue('s1x', 0.25)).toBe(visiteRetenue('s1x', 0.25));
  });

  it('écarte les robots et les navigateurs automatisés', () => {
    expect(estRobot(null)).toBe(true);
    expect(estRobot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(estRobot('Mozilla/5.0 HeadlessChrome/120')).toBe(true);
    expect(estRobot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1')).toBe(false);
  });
});
