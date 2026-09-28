import { describe, expect, it } from 'vitest';
import { entreeConnexionLien, entreeMessageParticulier, entreeSuppressionCompte } from '../schemas';
import { STATUTS_DEMANDE } from '../schemas/demandes';
import {
  contientCoordonnees,
  ETAPES_SUIVI,
  etapeSuivi,
  LIBELLES_STATUT_PARTICULIER,
  masquerCoordonnees,
  resumeSuivi,
} from './index';

describe('masquerCoordonnees (ESP-03)', () => {
  it.each([
    'Appelez-moi au 06 12 34 56 78',
    'mon numéro : 0612345678',
    'tel +33 6 12 34 56 78 merci',
    '06.12.34.56.78',
    '06-12-34-56-78',
  ])('masque le numéro dans « %s »', (t) => {
    const r = masquerCoordonnees(t);
    expect(r.masque).toBe(true);
    expect(r.texte).not.toMatch(/\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/);
    expect(r.texte).toContain('[numéro masqué]');
  });

  it('masque une adresse email', () => {
    const r = masquerCoordonnees('écrivez à camille.m+devis@gmail.com svp');
    expect(r).toEqual({ texte: 'écrivez à [email masqué] svp', masque: true });
  });

  it('laisse intacts les petits nombres, dates et surfaces', () => {
    const t = 'Salle de bain de 6 m², visite le 12/10 à 18 h, budget 9 000 €';
    expect(masquerCoordonnees(t)).toEqual({ texte: t, masque: false });
    expect(contientCoordonnees(t)).toBe(false);
  });

  it('contientCoordonnees détecte avant l’envoi', () => {
    expect(contientCoordonnees('06 12 34 56 78')).toBe(true);
    expect(contientCoordonnees('a@b.fr')).toBe(true);
  });
});

describe('suivi des demandes (ESP-01)', () => {
  it('chaque statut a un libellé et une étape', () => {
    for (const s of STATUTS_DEMANDE) {
      expect(LIBELLES_STATUT_PARTICULIER[s].libelle.length).toBeGreaterThan(0);
      expect(etapeSuivi(s)).toBeGreaterThanOrEqual(0);
      expect(etapeSuivi(s)).toBeLessThanOrEqual(ETAPES_SUIVI.length);
    }
  });

  it('étapes de la maquette', () => {
    expect(etapeSuivi('nouvelle')).toBe(1);
    expect(etapeSuivi('attribuee')).toBe(2);
    expect(etapeSuivi('devis_recus')).toBe(3);
    expect(etapeSuivi('close')).toBe(4);
    expect(etapeSuivi('annulee')).toBe(0);
  });

  it('résumé : artisans et devis', () => {
    expect(resumeSuivi({ nbArtisans: 0, nbDevis: 0 })).toBe('Artisans en cours de sélection');
    expect(resumeSuivi({ nbArtisans: 1, nbDevis: 0 })).toBe(
      '1 artisan · aucun devis pour l’instant',
    );
    expect(resumeSuivi({ nbArtisans: 3, nbDevis: 2 })).toBe('2 devis · 1 artisan en attente');
    expect(resumeSuivi({ nbArtisans: 2, nbDevis: 2 })).toBe('2 devis reçus');
  });
});

describe('entrées de l’espace particulier', () => {
  it('message : texte requis, 4 000 caractères au plus', () => {
    const base = { cleIdempotence: 'abcdefgh', demandeId: 'd1', artisanId: 'a1' };
    expect(entreeMessageParticulier.safeParse({ ...base, texte: '  ' }).success).toBe(false);
    expect(entreeMessageParticulier.safeParse({ ...base, texte: 'x'.repeat(4001) }).success).toBe(
      false,
    );
    expect(entreeMessageParticulier.safeParse({ ...base, texte: 'Bonjour' }).success).toBe(true);
  });

  it('suppression : confirmation explicite', () => {
    expect(entreeSuppressionCompte.safeParse({ confirmation: 'oui' }).success).toBe(false);
    expect(entreeSuppressionCompte.safeParse({ confirmation: 'SUPPRIMER' }).success).toBe(true);
  });

  it('connexion par lien : email et code', () => {
    expect(entreeConnexionLien.safeParse({ email: 'a@b.fr', oobCode: 'x' }).success).toBe(false);
    expect(
      entreeConnexionLien.safeParse({ email: 'a@b.fr', oobCode: 'AbCdEf0123456789' }).success,
    ).toBe(true);
  });
});
