import { describe, expect, it } from 'vitest';
import { menuPro } from './index';

const cles = (m: ReturnType<typeof menuPro>) => m.flatMap((s) => s.liens.map((l) => l.cle));
const membre = (role: 'proprietaire' | 'gerant' | 'collaborateur' | 'comptable') => ({
  role,
  statut: 'actif' as const,
});

describe('menu pro : Dessin (DESSIN.md §1)', () => {
  it('absent tant que le flag est inactif', () => {
    expect(cles(menuPro(membre('proprietaire')))).not.toContain('dessin');
  });

  it('flag actif : visible avec dessin.gerer, jamais pour le comptable', () => {
    const avec = (r: Parameters<typeof membre>[0]) =>
      cles(menuPro(membre(r), {}, {}, { dessin: true }));
    expect(avec('proprietaire')).toContain('dessin');
    expect(avec('gerant')).toContain('dessin');
    expect(avec('collaborateur')).toContain('dessin');
    expect(avec('comptable')).not.toContain('dessin');
  });
});
