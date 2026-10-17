import { describe, expect, it } from 'vitest';
import { identifiantIncident } from './incident';

describe('identifiantIncident', () => {
  it('dérive l’identifiant du digest', () => {
    expect(identifiantIncident('7F3A9C21-99')).toBe('PH-ERR-7f3a9c21');
    expect(identifiantIncident('1234567890')).toBe('PH-ERR-12345678');
  });
  it('sans digest, en tire un au hasard', () => {
    expect(identifiantIncident(undefined, () => 'abcdef12-3456')).toBe('PH-ERR-abcdef12');
  });
  it('complète un digest trop court', () => {
    expect(identifiantIncident('42')).toBe('PH-ERR-42000000');
  });
});
