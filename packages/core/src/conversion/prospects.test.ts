import { describe, expect, it } from 'vitest';
import { emailsProspect } from './prospects';

const J = 86_400_000;
// Jeudi 1er octobre 2026, 7 h à Paris.
const T = Date.UTC(2026, 9, 1, 5);

describe('séquence S1 des prospects (CONVERSION §3)', () => {
  it('J+12 : « je clôture votre dossier ? », une seule fois', () => {
    expect(emailsProspect({ creeLe: T - 12 * J, maintenant: T, envois: {} })).toContain(
      'prospect-derniere',
    );
    expect(emailsProspect({ creeLe: T - 11 * J, maintenant: T, envois: {} })).not.toContain(
      'prospect-derniere',
    );
    expect(
      emailsProspect({ creeLe: T - 20 * J, maintenant: T, envois: { derniere: T - 8 * J } }),
    ).not.toContain('prospect-derniere');
  });
  it('résumé mensuel : le 1er du mois, pendant 6 mois, une fois par mois', () => {
    expect(emailsProspect({ creeLe: T - 40 * J, maintenant: T, envois: {} })).toContain(
      'resume-zone-mensuel',
    );
    expect(emailsProspect({ creeLe: T - 40 * J, maintenant: T + J, envois: {} })).not.toContain(
      'resume-zone-mensuel',
    );
    expect(emailsProspect({ creeLe: T - 200 * J, maintenant: T, envois: {} })).not.toContain(
      'resume-zone-mensuel',
    );
    expect(
      emailsProspect({ creeLe: T - 40 * J, maintenant: T, envois: { resume: T - 3_600_000 } }),
    ).not.toContain('resume-zone-mensuel');
  });
  it('demande de la zone : de J+1 à J+30, au plus une par semaine', () => {
    const base = { maintenant: T, envois: {} };
    expect(emailsProspect({ ...base, creeLe: T - 2 * J })).toContain('prospect-demande-zone');
    expect(emailsProspect({ ...base, creeLe: T - 3_600_000 })).not.toContain(
      'prospect-demande-zone',
    );
    expect(emailsProspect({ ...base, creeLe: T - 31 * J })).not.toContain('prospect-demande-zone');
    expect(
      emailsProspect({ creeLe: T - 10 * J, maintenant: T, envois: { demandeZone: T - 6 * J } }),
    ).not.toContain('prospect-demande-zone');
  });
});
