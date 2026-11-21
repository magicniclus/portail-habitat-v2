import { describe, expect, it } from 'vitest';
import { CODES_ROLE, peut, type ActionEquipe, type Membre } from './permissions';

const membre = (role: Membre['role'], surcharge: Partial<Membre> = {}): Membre => ({
  role,
  statut: 'actif',
  ...surcharge,
});

describe('peut() — matrice COMPTES §4.1', () => {
  const cas: [ActionEquipe, Membre['role'][]][] = [
    ['demandes.repondre', ['proprietaire', 'gerant', 'collaborateur']],
    ['fiche.modifier', ['proprietaire', 'gerant']],
    ['realisations.modifier', ['proprietaire', 'gerant', 'collaborateur']],
    ['avis.repondre', ['proprietaire', 'gerant']],
    ['documents.televerser', ['proprietaire', 'gerant', 'collaborateur']],
    ['statistiques.voir', ['proprietaire', 'gerant', 'collaborateur']],
    ['abonnement.gerer', ['proprietaire', 'gerant']],
    ['factures.voir', ['proprietaire', 'gerant', 'comptable']],
    ['membres.gerer', ['proprietaire', 'gerant']],
    ['propriete.transferer', ['proprietaire']],
    ['entreprise.fermer', ['proprietaire']],
    ['leads.debloquer', ['proprietaire', 'gerant']],
  ];
  for (const [action, autorises] of cas) {
    for (const role of ['proprietaire', 'gerant', 'collaborateur', 'comptable'] as const) {
      it(`${role} ${autorises.includes(role) ? 'peut' : 'ne peut pas'} « ${action} »`, () => {
        expect(peut(membre(role), action)).toBe(autorises.includes(role));
      });
    }
  }
});

describe('peut() — cas particuliers', () => {
  it('un membre suspendu ne peut rien', () => {
    expect(peut(membre('proprietaire', { statut: 'suspendu' }), 'factures.voir')).toBe(false);
  });
  it('sans membre (non membre), rien', () => {
    expect(peut(null, 'statistiques.voir')).toBe(false);
  });
  it('un collaborateur peut débloquer si la permission lui est accordée', () => {
    expect(
      peut(membre('collaborateur', { permissions: ['leads.debloquer'] }), 'leads.debloquer'),
    ).toBe(true);
  });
  it('une surcharge ne donne jamais les actions réservées au propriétaire', () => {
    const m = membre('gerant', { permissions: ['propriete.transferer', 'entreprise.fermer'] });
    expect(peut(m, 'propriete.transferer')).toBe(false);
    expect(peut(m, 'entreprise.fermer')).toBe(false);
  });
  it('collaborateur : seulement les demandes de ses métiers ou qui lui sont assignées', () => {
    const c = membre('collaborateur', { metiers: ['plombier'] });
    expect(peut(c, 'demandes.repondre', { metier: 'plombier' })).toBe(true);
    expect(peut(c, 'demandes.repondre', { metier: 'peintre' })).toBe(false);
    expect(peut(c, 'demandes.repondre', { metier: 'peintre', assigneA: 'moi', uid: 'moi' })).toBe(
      true,
    );
    expect(peut(membre('collaborateur'), 'demandes.repondre', { metier: 'peintre' })).toBe(true);
    expect(
      peut(membre('gerant', { metiers: ['plombier'] }), 'demandes.repondre', { metier: 'peintre' }),
    ).toBe(true);
  });
  it('un gérant ne gère ni le propriétaire ni les autres gérants', () => {
    const g = membre('gerant');
    expect(peut(g, 'membres.gerer', { roleCible: 'collaborateur' })).toBe(true);
    expect(peut(g, 'membres.gerer', { roleCible: 'gerant' })).toBe(false);
    expect(peut(g, 'membres.gerer', { roleCible: 'proprietaire' })).toBe(false);
    expect(peut(membre('proprietaire'), 'membres.gerer', { roleCible: 'gerant' })).toBe(true);
  });
  it('codes de rôle des claims', () => {
    expect(CODES_ROLE).toEqual({
      proprietaire: 'p',
      gerant: 'g',
      collaborateur: 'c',
      comptable: 'x',
    });
  });
});
