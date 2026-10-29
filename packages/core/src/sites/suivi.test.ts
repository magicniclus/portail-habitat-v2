import { describe, expect, it } from 'vitest';
import { configSuivi, entreeSuivi, SUIVI_VIDE, suiviActif } from './suivi';

describe('suivi publicitaire du site (balise Google, pixel Meta)', () => {
  it('identifiants acceptés, nettoyés ; jamais de code collé', () => {
    const ok = entreeSuivi.parse({
      google: ' g-ab12cd34ef ',
      conversionAds: 'AW-123456789/AbC-dEf_12',
      meta: '1234567890123456',
      evenements: { demande: true, appel: false },
    });
    expect(ok.google).toBe('G-AB12CD34EF');
    for (const google of ['GTM-ABC123', 'AW-1234567', 'GT-ABCD123'])
      expect(entreeSuivi.safeParse({ ...SUIVI_VIDE, google }).success).toBe(true);
    for (const google of ['<script>', 'UA-1234-1', 'G-', 'gtag("config")'])
      expect(entreeSuivi.safeParse({ ...SUIVI_VIDE, google }).success).toBe(false);
    expect(entreeSuivi.safeParse({ ...SUIVI_VIDE, meta: '12ab' }).success).toBe(false);
    expect(entreeSuivi.safeParse({ ...SUIVI_VIDE, conversionAds: 'AW-1/x' }).success).toBe(false);
  });

  it('inactif sans identifiant : ni bandeau ni script', () => {
    expect(suiviActif(undefined)).toBe(false);
    expect(suiviActif(SUIVI_VIDE)).toBe(false);
    expect(configSuivi(SUIVI_VIDE)).toBeNull();
  });

  it('configuration lue par le script du site', () => {
    const s = { ...SUIVI_VIDE, google: 'GTM-ABC123', meta: '123456789012345' };
    expect(suiviActif(s)).toBe(true);
    expect(configSuivi(s)).toEqual({
      gtm: 'GTM-ABC123',
      meta: '123456789012345',
      demande: true,
      appel: true,
    });
    expect(
      configSuivi({ ...SUIVI_VIDE, google: 'G-AB12CD34', conversionAds: 'AW-123456789/AbCdEf' }),
    ).toEqual({ gtag: 'G-AB12CD34', ads: 'AW-123456789/AbCdEf', demande: true, appel: true });
  });
});
