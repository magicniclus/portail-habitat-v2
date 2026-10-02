import { describe, expect, it } from 'vitest';
import {
  claimsUtilisateur,
  masquerEmail,
  peutQuitter,
  repartirSieges,
  siegesDisponibles,
  TAILLE_MAX_CLAIMS,
} from './comptes';

describe('claims (COMPTES §1)', () => {
  it('particulier seul', () => {
    expect(claimsUtilisateur({ roles: ['particulier'], membres: [] })).toEqual({
      roles: ['particulier'],
    });
  });
  it('membre actif de deux entreprises ; les suspendus n’ont pas de claim', () => {
    expect(
      claimsUtilisateur({
        roles: ['particulier', 'artisan'],
        membres: [
          { artisanId: 'a1', role: 'proprietaire', statut: 'actif' },
          { artisanId: 'a2', role: 'comptable', statut: 'actif' },
          { artisanId: 'a3', role: 'collaborateur', statut: 'suspendu' },
        ],
      }),
    ).toEqual({ roles: ['particulier', 'artisan'], ent: { a1: 'p', a2: 'x' } });
  });
  it('équipe interne : rôle, sections et droit aux données personnelles', () => {
    const c = claimsUtilisateur({
      roles: [],
      membres: [],
      admin: { role: 'lecture', actif: true, permissionsEffectives: ['demandes.lire'] },
    });
    expect(c).toEqual({ roles: [], staff: { r: 'lecture', s: ['dem'], pii: false } });
    const m = claimsUtilisateur({
      roles: [],
      membres: [],
      admin: { role: 'moderateur', actif: true, permissionsEffectives: ['avis.moderer'] },
    });
    expect(m.staff?.pii).toBe(true);
  });
  it('admin inactif : aucun claim staff', () => {
    const c = claimsUtilisateur({
      roles: [],
      membres: [],
      admin: { role: 'admin', actif: false, permissionsEffectives: ['demandes.lire'] },
    });
    expect(c.staff).toBeUndefined();
  });
  it('plus de 10 entreprises actives : refusé', () => {
    const membres = Array.from({ length: 11 }, (_, i) => ({
      artisanId: `a${i}`,
      role: 'collaborateur' as const,
      statut: 'actif' as const,
    }));
    expect(() => claimsUtilisateur({ roles: ['artisan'], membres })).toThrow(/10 entreprises/);
  });
  it('taille maximale respectée avec 10 entreprises aux identifiants longs', () => {
    const membres = Array.from({ length: 10 }, (_, i) => ({
      artisanId: `${'x'.repeat(20)}${i}`,
      role: 'gerant' as const,
      statut: 'actif' as const,
    }));
    const c = claimsUtilisateur({ roles: ['particulier', 'artisan'], membres });
    expect(JSON.stringify(c).length).toBeLessThanOrEqual(TAILLE_MAX_CLAIMS);
  });
  it('claims trop volumineux : refusé', () => {
    const membres = Array.from({ length: 10 }, (_, i) => ({
      artisanId: `${'x'.repeat(120)}${i}`,
      role: 'gerant' as const,
      statut: 'actif' as const,
    }));
    expect(() => claimsUtilisateur({ roles: ['artisan'], membres })).toThrow(/1 000 octets/);
  });
});

describe('sièges (COMPTES §4.3)', () => {
  it('invitations en cours comptées', () => {
    expect(siegesDisponibles({ siegesMax: 3, nbMembres: 2, invitationsEnCours: 1 })).toBe(0);
    expect(siegesDisponibles({ siegesMax: 3, nbMembres: 1, invitationsEnCours: 0 })).toBe(2);
    expect(siegesDisponibles({ siegesMax: 1, nbMembres: 4, invitationsEnCours: 0 })).toBe(0);
  });
  const membres = [
    { uid: 'prop', role: 'proprietaire' as const, ajouteLe: 1 },
    { uid: 'g', role: 'gerant' as const, ajouteLe: 2 },
    { uid: 'c', role: 'collaborateur' as const, ajouteLe: 3 },
    { uid: 'x', role: 'comptable' as const, ajouteLe: 4 },
  ];
  it('Premium résilié avec 4 membres → 3 suspendus, propriétaire gardé', () => {
    expect(repartirSieges(membres, 1)).toEqual({ actifs: ['prop'], suspendus: ['g', 'c', 'x'] });
  });
  it('réactivation : tout le monde revient', () => {
    expect(repartirSieges(membres, 5)).toEqual({ actifs: ['prop', 'g', 'c', 'x'], suspendus: [] });
  });
  it('sièges rachetés : le propriétaire choisit qui garder, sinon les plus anciens', () => {
    expect(repartirSieges(membres, 2, ['x'])).toEqual({
      actifs: ['prop', 'x'],
      suspendus: ['g', 'c'],
    });
    expect(repartirSieges(membres, 3)).toEqual({ actifs: ['prop', 'g', 'c'], suspendus: ['x'] });
  });
});

describe('départ (COMPTES §4.8)', () => {
  const equipe = [
    { uid: 'prop', role: 'proprietaire' as const, statut: 'actif' as const },
    { uid: 'g', role: 'gerant' as const, statut: 'actif' as const },
  ];
  it('le dernier propriétaire ne peut pas partir', () => {
    expect(peutQuitter(equipe, 'prop')).toBe(false);
    expect(peutQuitter(equipe, 'g')).toBe(true);
  });
  it('deux propriétaires : l’un peut partir', () => {
    expect(
      peutQuitter([...equipe, { uid: 'p2', role: 'proprietaire', statut: 'actif' }], 'prop'),
    ).toBe(true);
  });
  it('non-membre : rien à quitter', () => expect(peutQuitter(equipe, 'z')).toBe(false));
});

describe('email masqué (COMPTES §4.2)', () => {
  it.each([
    ['camille.durand@exemple.fr', 'c•••@e•••.fr'],
    ['A@b.co.uk', 'a•••@b•••.uk'],
    ['sans-arobase', '•••'],
  ])('%s → %s', (e, m) => expect(masquerEmail(e)).toBe(m));
});
