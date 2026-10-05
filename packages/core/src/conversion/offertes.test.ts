import { describe, expect, it } from 'vitest';
import { DEMANDE_OFFERTE, demandeOffrable, destinatairesDemandeOfferte } from './offertes';

const H = 3_600_000;
const bordeaux = { latitude: 44.84, longitude: -0.58 };

describe('demande offrable (CONVERSION §3 bis)', () => {
  const T = 1000 * H;
  it('appel d’offres sans déblocage depuis 24 h, demande de moins de 72 h, pas encore offerte', () => {
    const ok = { ouvertLe: T - 25 * H, creeeLe: T - 30 * H, nbDeblocages: 0 };
    expect(demandeOffrable(ok, T)).toBe(true);
    expect(demandeOffrable({ ...ok, ouvertLe: T - 23 * H }, T)).toBe(false);
    expect(demandeOffrable({ ...ok, creeeLe: T - 72 * H }, T)).toBe(false);
    expect(demandeOffrable({ ...ok, nbDeblocages: 1 }, T)).toBe(false);
    expect(demandeOffrable({ ...ok, dejaOfferte: true }, T)).toBe(false);
  });
});

describe('destinataires', () => {
  const c = (id: string, score: number, p: Record<string, unknown> = {}) => ({
    id,
    score,
    metiers: ['plombier'],
    centre: bordeaux,
    rayonKm: 20,
    dejaBeneficiaire: false,
    temoin: false,
    ...p,
  });
  const demande = { metier: 'plombier', geo: { latitude: 44.8, longitude: -0.6 } };
  it('gratuits du métier qui couvrent le chantier, triés par score, 5 au plus', () => {
    const r = destinatairesDemandeOfferte(demande, [
      c('a', 40),
      c('b', 90),
      c('loin', 99, { centre: { latitude: 45.76, longitude: 4.83 } }),
      c('peintre', 99, { metiers: ['peintre'] }),
      c('deja', 99, { dejaBeneficiaire: true }),
      c('temoin', 99, { temoin: true }),
      c('c', 10),
      c('d', 20),
      c('e', 30),
      c('f', 50),
    ]);
    expect(r.map((x) => x.id)).toEqual(['b', 'f', 'a', 'e', 'd']);
    expect(r[0]!.distanceKm).toBe(5);
    expect(DEMANDE_OFFERTE.destinataires).toBe(5);
  });
});
