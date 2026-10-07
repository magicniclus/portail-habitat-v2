import { describe, expect, it } from 'vitest';
import { delaiPremiereDemande, emailsProspect } from './prospects';

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

describe('témoignage J+5 (CONVERSION §3 S1)', () => {
  it('part à J+5, une seule fois, jusqu’à J+30', () => {
    expect(emailsProspect({ creeLe: T - 5 * J, maintenant: T, envois: {} })).toContain(
      'prospect-temoignage',
    );
    expect(emailsProspect({ creeLe: T - 4 * J, maintenant: T, envois: {} })).not.toContain(
      'prospect-temoignage',
    );
    expect(
      emailsProspect({ creeLe: T - 6 * J, maintenant: T, envois: { temoignage: T - J } }),
    ).not.toContain('prospect-temoignage');
    expect(emailsProspect({ creeLe: T - 31 * J, maintenant: T, envois: {} })).not.toContain(
      'prospect-temoignage',
    );
  });
});

describe('délai avant la première demande', () => {
  const ins = (jours: number, premiere?: number) => ({
    inscritLe: T - jours * J,
    ...(premiere !== undefined ? { premiereLe: T - jours * J + premiere * J } : {}),
  });
  it('moyenne en jours des inscrits de moins de 6 mois qui ont reçu une demande', () => {
    expect(delaiPremiereDemande([ins(30, 2), ins(60, 4), ins(90, 9), ins(20)], T)).toBe(5);
  });
  it('rien sous 3 artisans mesurés, et les inscrits de plus de 6 mois sont ignorés', () => {
    expect(delaiPremiereDemande([ins(30, 2), ins(60, 4)], T)).toBeNull();
    expect(delaiPremiereDemande([ins(30, 2), ins(60, 4), ins(200, 1)], T)).toBeNull();
  });
  it('au moins 1 jour', () => {
    expect(delaiPremiereDemande([ins(30, 0.1), ins(60, 0.2), ins(90, 0.3)], T)).toBe(1);
  });
});
