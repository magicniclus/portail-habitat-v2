import { describe, expect, it } from 'vitest';
import { entreeInscriptionEtape1, entreeInscriptionEtape2 } from '../schemas';
import {
  chantiersDesMetiers,
  forceMotDePasse,
  intentionsApresChangement,
  statutCompte,
  statutZone,
} from './index';

const I = [
  { id: 'toit-refection', libelle: 'Réfection de toiture', metier: 'couvreur' },
  { id: 'velux', libelle: 'Pose de Velux', metier: 'couvreur' },
  { id: 'gouttieres', libelle: 'Gouttières', metier: 'zingueur' },
  { id: 'sdb', libelle: 'Salle de bain', metier: 'plombier' },
];

describe('chantiers (ONB-01c)', () => {
  it('chantiers de chaque métier choisi', () => {
    expect(chantiersDesMetiers(['couvreur'], I)[0]!.chantiers.map((c) => c.id)).toEqual([
      'toit-refection',
      'velux',
    ]);
  });
  it('ajouter « zingueur » coche ses chantiers ; un chantier décoché le reste', () => {
    const r = intentionsApresChangement(
      { metiers: ['couvreur'], intentions: ['toit-refection'] },
      ['couvreur', 'zingueur'],
      I,
    );
    expect(r).toEqual(['toit-refection', 'gouttieres']);
  });
  it('retirer un métier retire ses chantiers', () => {
    expect(
      intentionsApresChangement(
        { metiers: ['couvreur', 'zingueur'], intentions: ['velux', 'gouttieres'] },
        ['couvreur'],
        I,
      ),
    ).toEqual(['velux']);
  });
});

describe('barre fixe (ONB-07)', () => {
  it('zone : complète seulement avec une ville', () => {
    expect(statutZone({ rayonKm: 30 })).toEqual({
      complete: false,
      statut: 'Choisissez votre ville',
    });
    expect(statutZone({ ville: 'Mérignac', rayonKm: 30 })).toEqual({
      complete: true,
      statut: 'Mérignac · 30 km',
    });
  });
  it('compte : entreprise, mot de passe solide et confirmé, conditions', () => {
    const base = {
      entrepriseChoisie: true,
      motDePasse: 'Chantier-2026!',
      confirmation: 'Chantier-2026!',
      cgv: true,
    };
    expect(statutCompte(base).complete).toBe(true);
    expect(statutCompte({ ...base, entrepriseChoisie: false }).complete).toBe(false);
    expect(statutCompte({ ...base, motDePasse: 'court' }).complete).toBe(false);
    expect(statutCompte({ ...base, confirmation: 'autre' }).statut).toMatch(/différents/);
    expect(statutCompte({ ...base, cgv: false }).complete).toBe(false);
  });
  it('force du mot de passe', () => {
    expect(forceMotDePasse('abc')).toBe(0);
    expect(forceMotDePasse('abcdefgh')).toBe(1);
    expect(forceMotDePasse('abcdefghij')).toBe(2);
    expect(forceMotDePasse('Chantier-2026!')).toBe(4);
  });
});

describe('entrées de l’inscription', () => {
  const etape1 = {
    nom: 'Julien Bertrand',
    telephone: '06 12 34 56 78',
    email: 'j@b.fr',
    codePostal: '33000',
    metierPrincipal: 'couvreur',
    metiers: ['couvreur'],
    intentions: ['velux'],
    cgv: true,
  };
  it('ONB-01b : sans métier principal parmi les métiers, refus', () => {
    expect(entreeInscriptionEtape1.safeParse(etape1).success).toBe(true);
    expect(entreeInscriptionEtape1.safeParse({ ...etape1, metiers: ['plombier'] }).success).toBe(
      false,
    );
    expect(entreeInscriptionEtape1.safeParse({ ...etape1, metierPrincipal: '' }).success).toBe(
      false,
    );
  });
  it('rayon 10 à 100 km (D31c)', () => {
    const z = { ville: 'Mérignac', centre: { latitude: 44.8, longitude: -0.6 } };
    expect(entreeInscriptionEtape2.safeParse({ ...z, rayonKm: 5 }).success).toBe(false);
    expect(entreeInscriptionEtape2.safeParse({ ...z, rayonKm: 30 }).success).toBe(true);
  });
});
