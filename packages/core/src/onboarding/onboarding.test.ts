import { describe, expect, it } from 'vitest';
import { entreeInscriptionEtape1, entreeInscriptionEtape2 } from '../schemas';
import {
  chantiersDesMetiers,
  decouperNom,
  DEMANDES_RECENTES_MIN,
  forceMotDePasse,
  intentionsApresChangement,
  phraseDemandesRecentes,
  RAYON_ZONE,
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
  it('compte par mot de passe : entreprise, mot de passe solide et confirmé (conditions acceptées à l’étape 1)', () => {
    const base = {
      methode: 'motDePasse',
      entrepriseChoisie: true,
      motDePasse: 'Chantier-2026!',
      confirmation: 'Chantier-2026!',
    } as const;
    expect(statutCompte(base).complete).toBe(true);
    expect(statutCompte({ ...base, entrepriseChoisie: false }).complete).toBe(false);
    expect(statutCompte({ ...base, motDePasse: 'court' }).complete).toBe(false);
    expect(statutCompte({ ...base, confirmation: 'autre' }).statut).toMatch(/différents/);
  });
  it('compte Google : l’entreprise suffit, aucun mot de passe', () => {
    const g = {
      methode: 'google',
      entrepriseChoisie: true,
      motDePasse: '',
      confirmation: '',
    } as const;
    expect(statutCompte(g)).toEqual({ complete: true, statut: 'Tout est prêt' });
    expect(statutCompte({ ...g, entrepriseChoisie: false }).complete).toBe(false);
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

describe('demandes récentes (étapes 2 et 3, décision du 15/11/2026)', () => {
  it('engagement fixe du propriétaire : au moins 3 demandes en 48 h, sans calcul', () => {
    expect(DEMANDES_RECENTES_MIN).toBe(3);
    expect(phraseDemandesRecentes({ ville: 'Mérignac', rayonKm: 40 })).toEqual({
      phrase:
        'Au moins 3 demandes de travaux déposées ces dernières 48 h autour de Mérignac, dans un rayon de 40 km.',
      precision:
        'Certaines ont peut-être déjà été confiées à un artisan : vous verrez dans votre espace celles qui sont encore ouvertes.',
    });
  });
});

describe('decouperNom (profil créé à l’inscription)', () => {
  it('premier mot = prénom, le reste = nom ; espaces ignorés', () => {
    expect(decouperNom('Julien Bertrand')).toEqual({ prenom: 'Julien', nom: 'Bertrand' });
    expect(decouperNom('  Marie  de la Tour ')).toEqual({ prenom: 'Marie', nom: 'de la Tour' });
    expect(decouperNom('Julien')).toEqual({ prenom: 'Julien' });
    expect(decouperNom('   ')).toEqual({});
  });
});

describe('rayon de la zone (curseur 10 à 100 km)', () => {
  it('bornes et pas de 5 km', () => {
    expect(RAYON_ZONE).toEqual({ min: 10, max: 100, pas: 5, defaut: 30 });
  });
});
