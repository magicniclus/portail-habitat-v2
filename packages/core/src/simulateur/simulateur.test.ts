import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { arrondiAffichage, coefRegion, estimer, tauxTva } from './estimer';
import type { Acces, Reponses } from './types';
import { referentielDeTest } from './__tests__/referentiel';

interface Cas {
  prestationId: string;
  reponses: Reponses;
  codePostal: string;
  acces: Acces;
  attendu: {
    coefRegion: number;
    postes: { label: string; min: number; max: number }[];
    aides: number;
    totalMin: number;
    totalMax: number;
  };
}

const { cas } = JSON.parse(
  readFileSync(resolve(__dirname, '__tests__/simulateur.cases.json'), 'utf8'),
) as { cas: Cas[] };
const r = referentielDeTest();
const centimes = (euros: number) => euros * 100;

describe('simulateur : résultats identiques à la maquette (cas générés depuis calculer())', () => {
  it('couvre les 112 prestations', () => {
    expect(new Set(cas.map((c) => c.prestationId)).size).toBe(112);
  });

  it.each(
    cas.map((c, i) => [`${i} ${c.prestationId} ${c.codePostal || '∅'} ${c.acces}`, c] as const),
  )('%s', (_, c) => {
    const e = estimer(
      {
        prestationId: c.prestationId,
        reponses: c.reponses,
        codePostal: c.codePostal,
        acces: c.acces,
      },
      r,
    );
    const coef = c.attendu.coefRegion * r.coefficients.acces[c.acces];
    expect(e.coefRegion).toBe(c.attendu.coefRegion);
    expect(e.postes.map((p) => p.label)).toEqual(c.attendu.postes.map((p) => p.label));
    e.postes.forEach((p, i) => {
      const a = c.attendu.postes[i]!;
      expect(Math.abs(p.minCentimes - centimes(a.min) * coef)).toBeLessThanOrEqual(1);
      expect(Math.abs(p.maxCentimes - centimes(a.max) * coef)).toBeLessThanOrEqual(1);
    });
    expect(Math.abs(e.aidesCentimes - centimes(c.attendu.aides))).toBeLessThanOrEqual(1);
    expect(Math.abs(e.minCentimes - centimes(c.attendu.totalMin))).toBeLessThanOrEqual(1);
    expect(Math.abs(e.maxCentimes - centimes(c.attendu.totalMax))).toBeLessThanOrEqual(1);
    expect(Number.isInteger(e.minCentimes) && Number.isInteger(e.maxCentimes)).toBe(true);
  });
});

describe('simulateur : règles', () => {
  it('coefficients régionaux (README)', () => {
    expect(coefRegion('75011', r.coefficients).coef).toBe(1.16);
    expect(coefRegion('13008', r.coefficients).coef).toBe(1.09);
    expect(coefRegion('33000', r.coefficients).coef).toBe(1.03);
    expect(coefRegion('24100', r.coefficients).coef).toBe(0.96);
    expect(coefRegion('', r.coefficients).coef).toBe(1);
    expect(coefRegion('33', r.coefficients).coef).toBe(1.03);
  });
  it('TVA : 5,5 % rénovation énergétique, taux du catalogue, sinon 10 %', () => {
    expect(tauxTva('isolation', r)).toBe(5.5);
    expect(tauxTva('peinture', r)).toBe(10);
    expect(tauxTva('sdb-douche', r)).toBe(10);
    expect(Object.values(r.tvaCatalogue)).toContain(20);
  });
  it('aides isolation plafonnées à min(40 % du total, surface × 22 €)', () => {
    const base = { prestationId: 'isolation', codePostal: '33000', acces: 'facile' as const };
    const v = { zone: 'combles', materiau: 'minerale', surface: 100, options: [], aides: 'oui' };
    const e = estimer({ ...base, reponses: v }, r);
    const sans = estimer({ ...base, reponses: { ...v, aides: 'non' } }, r);
    expect(e.aidesCentimes).toBe(Math.round(Math.min(sans.maxCentimes * 0.4, 100 * 2200)));
    expect(e.maxCentimes).toBe(sans.maxCentimes - e.aidesCentimes);
  });
  it('une option inconnue est refusée plutôt que chiffrée à zéro', () => {
    expect(() =>
      estimer(
        {
          prestationId: 'peinture',
          codePostal: '33000',
          acces: 'facile',
          reponses: { surface: 40, pieces: 2, hauteur: 'inventee', etat: 'bon', gamme: 'std' },
        },
        r,
      ),
    ).toThrow(/hauteur/);
    expect(() =>
      estimer({ prestationId: 'inexistante', codePostal: '', acces: 'facile', reponses: {} }, r),
    ).toThrow(/inconnue/);
  });
  it('les prix viennent du référentiel : les doubler double l’estimation', () => {
    const v = { surface: 40, pieces: 2, hauteur: 'std', etat: 'bon', gamme: 'std', extras: [] };
    const d = {
      prestationId: 'peinture',
      codePostal: '33000',
      acces: 'facile' as const,
      reponses: v,
    };
    const p = r.detailles.peinture;
    const double = {
      ...r,
      detailles: {
        ...r.detailles,
        peinture: { ...p, mursM2: [p.mursM2[0] * 2, p.mursM2[1] * 2] as const },
      },
    };
    const avant = estimer(d, r).postes[1]!;
    const apres = estimer(d, double).postes[1]!;
    expect(apres.minCentimes).toBe(avant.minCentimes * 2);
  });
  it('arrondi d’affichage à la dizaine d’euros', () => {
    expect(arrondiAffichage(123456)).toBe(123000);
    expect(arrondiAffichage(123500)).toBe(124000);
  });
});
