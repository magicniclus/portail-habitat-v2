import { describe, expect, it } from 'vitest';
import {
  COOKIE_CONSENTEMENT,
  DUREE_CONSENTEMENT_MS,
  ecrireConsentement,
  lireConsentement,
} from './cookies';

const t0 = Date.UTC(2026, 8, 28);

describe('consentement cookies (INTEGRATIONS §7, CNIL)', () => {
  it('aller-retour : choix conservé, horodaté', () => {
    const v = ecrireConsentement({ audienceDetaillee: true }, t0);
    expect(lireConsentement(v, t0 + 1000)).toEqual({ audienceDetaillee: true, le: t0 });
  });
  it('absent, illisible ou falsifié : on redemande (rien n’est déposé par défaut)', () => {
    expect(lireConsentement(undefined, t0)).toBeNull();
    expect(lireConsentement('nimporte', t0)).toBeNull();
    expect(lireConsentement(encodeURIComponent('{"v":1,"a":"oui","le":1}'), t0)).toBeNull();
  });
  it('redemandé au bout de 6 mois', () => {
    const v = ecrireConsentement({ audienceDetaillee: false }, t0);
    expect(lireConsentement(v, t0 + DUREE_CONSENTEMENT_MS - 1)).not.toBeNull();
    expect(lireConsentement(v, t0 + DUREE_CONSENTEMENT_MS)).toBeNull();
  });
  it('date dans le futur refusée', () => {
    expect(
      lireConsentement(ecrireConsentement({ audienceDetaillee: true }, t0 + 86_400_000), t0),
    ).toBeNull();
  });
  it('nom de cookie stable et valeur sans donnée personnelle', () => {
    expect(COOKIE_CONSENTEMENT).toBe('ph_consentement');
    expect(decodeURIComponent(ecrireConsentement({ audienceDetaillee: false }, t0))).toBe(
      `{"v":1,"a":0,"le":${t0}}`,
    );
  });
});
