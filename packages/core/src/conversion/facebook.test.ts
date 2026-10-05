import { describe, expect, it } from 'vitest';
import { formatFourchette } from '../format/euros';
import { LIEN_FACEBOOK, textePublicationFacebook } from './facebook';

const d = (travaux: string, budget: number, p: Record<string, unknown> = {}) => ({
  travaux,
  ville: 'Talence',
  minCentimes: budget,
  maxCentimes: budget + 100_000,
  delai: 'Sous 1 mois',
  ...p,
});

describe('publication Facebook du jour (CONVERSION §3 ter, CONV-08)', () => {
  it('5 à 8 demandes, plus gros budgets d’abord, lien avec les paramètres utm', () => {
    const t = textePublicationFacebook(
      Array.from({ length: 10 }, (_, i) => d(`Travaux ${i}`, (i + 1) * 100_000)),
      { zone: 'Gironde', date: Date.UTC(2026, 8, 26, 8) },
    )!;
    expect(t).toContain('🔨 Demandes de travaux du jour – Gironde (samedi 26/09)');
    expect(t.match(/^• /gm)).toHaveLength(8);
    expect(t.indexOf('Travaux 9')).toBeLessThan(t.indexOf('Travaux 8'));
    expect(t).toContain(
      `• Travaux 9 · Talence · ${formatFourchette(1_000_000, 1_100_000)} · Sous 1 mois`,
    );
    expect(t).toContain(LIEN_FACEBOOK);
    expect(LIEN_FACEBOOK).toBe(
      'https://www.portailhabitat.fr/pro?utm_source=facebook&utm_medium=groupe&utm_campaign=trouver-chantier',
    );
  });
  it('moins de 5 demandes : pas de publication', () => {
    expect(textePublicationFacebook([d('A', 1)], { zone: 'Gironde', date: 0 })).toBeNull();
  });
  it('aucune donnée personnelle : seuls travaux, commune, budget et délai sont repris', () => {
    const t = textePublicationFacebook(
      Array.from({ length: 5 }, () =>
        d('Toiture', 500_000, { nom: 'Dupont', telephone: '0612345678', email: 'a@b.fr' }),
      ),
      { zone: 'Gironde', date: 0 },
    )!;
    expect(t).not.toMatch(/Dupont|0612345678|a@b\.fr/);
  });
});
