import { describe, expect, it } from 'vitest';
import {
  accueilPro,
  completudeFiche,
  etapesMiseEnLigne,
  menuPro,
  ongletsMobiles,
  SEUIL_FICHE_EN_LIGNE,
} from './index';

const membre = (role: 'proprietaire' | 'gerant' | 'collaborateur' | 'comptable') => ({
  role,
  statut: 'actif' as const,
});
const cles = (m: ReturnType<typeof menuPro>) => m.flatMap((s) => s.liens.map((l) => l.cle));

describe('menuPro', () => {
  it('le propriétaire voit tout, groupé comme la maquette', () => {
    const m = menuPro(membre('proprietaire'));
    expect(m.map((s) => s.titre)).toEqual(["Vue d'ensemble", 'Gestion', 'Mon entreprise']);
    expect(cles(m)).toEqual([
      'tableauDeBord',
      'fiche',
      'demandes',
      'appelsOffres',
      'avis',
      'statistiques',
      'equipe',
      'facturation',
      'compte',
      'aide',
    ]);
  });

  it('le collaborateur ne voit pas la facturation', () => {
    expect(cles(menuPro(membre('collaborateur')))).not.toContain('facturation');
  });

  it('le comptable ne voit que la facturation, son compte et l’aide', () => {
    expect(cles(menuPro(membre('comptable')))).toEqual(['facturation', 'compte', 'aide']);
  });

  it('badges repris sur les liens, sections vides retirées', () => {
    const m = menuPro(membre('proprietaire'), { demandes: 3, appelsOffres: 0 });
    const liens = m.flatMap((s) => s.liens);
    expect(liens.find((l) => l.cle === 'demandes')?.badge).toBe(3);
    expect(liens.find((l) => l.cle === 'appelsOffres')?.badge).toBeUndefined();
    expect(menuPro(membre('comptable')).every((s) => s.liens.length > 0)).toBe(true);
  });

  it('membre suspendu ou absent : compte et aide seulement', () => {
    expect(cles(menuPro(null))).toEqual(['compte', 'aide']);
    expect(cles(menuPro({ role: 'gerant', statut: 'suspendu' }))).toEqual(['compte', 'aide']);
  });
});

describe('accueilPro', () => {
  it('tableau de bord, sauf pour le comptable (facturation)', () => {
    expect(accueilPro(membre('collaborateur'))).toBe('tableauDeBord');
    expect(accueilPro(membre('comptable'))).toBe('facturation');
    expect(accueilPro(null)).toBe('compte');
  });
});

const vide = {
  metiers: [],
  zoneDefinie: false,
  telephoneVerifie: false,
  description: '',
  logo: false,
  nbPhotos: 0,
  nbCertifications: 0,
};

describe('completudeFiche', () => {
  it('0 % pour une fiche vide, 100 % pour une fiche complète', () => {
    expect(completudeFiche(vide).pourcent).toBe(0);
    expect(
      completudeFiche({
        metiers: ['couvreur'],
        zoneDefinie: true,
        telephoneVerifie: true,
        description: 'x'.repeat(60),
        logo: true,
        nbPhotos: 3,
        nbCertifications: 1,
      }).pourcent,
    ).toBe(100);
  });

  it('après l’inscription (métiers et zone) : 20 %, sous le seuil de mise en ligne', () => {
    const c = completudeFiche({ ...vide, metiers: ['couvreur'], zoneDefinie: true });
    expect(c.pourcent).toBe(20);
    expect(c.pourcent).toBeLessThan(SEUIL_FICHE_EN_LIGNE);
    expect(c.criteres.filter((x) => !x.fait).map((x) => x.cle)).toEqual([
      'coordonnees',
      'description',
      'logo',
      'photos',
      'certifications',
    ]);
  });

  it('une description de moins de 60 caractères ou 2 photos ne comptent pas', () => {
    const c = completudeFiche({ ...vide, description: 'x'.repeat(59), nbPhotos: 2 });
    expect(c.pourcent).toBe(0);
  });
});

describe('etapesMiseEnLigne (EMAILS bienvenue-pro, ONB-06)', () => {
  it('3 étapes : téléphone, décennale, fiche à 60 %', () => {
    const e = etapesMiseEnLigne({ telephoneVerifie: false, decennale: 'absente', completude: 20 });
    expect(e.etapes.map((x) => x.cle)).toEqual(['telephone', 'decennale', 'fiche']);
    expect(e.etapes.every((x) => !x.fait)).toBe(true);
    expect(e.restantes).toBe(3);
  });

  it('décennale envoyée (en attente de vérification) : étape faite', () => {
    const e = etapesMiseEnLigne({ telephoneVerifie: true, decennale: 'envoyee', completude: 60 });
    expect(e.restantes).toBe(0);
  });

  it('décennale refusée : à renvoyer', () => {
    const e = etapesMiseEnLigne({ telephoneVerifie: true, decennale: 'refusee', completude: 80 });
    expect(e.etapes.find((x) => x.cle === 'decennale')).toMatchObject({
      fait: false,
      libelle: 'Renvoyer votre attestation décennale',
    });
  });
});

describe('ongletsMobiles (MOBILE §6)', () => {
  it('propriétaire : 4 onglets prioritaires, le reste dans « Plus »', () => {
    const { onglets, plus } = ongletsMobiles(menuPro(membre('proprietaire')));
    expect(onglets.map((l) => l.cle)).toEqual([
      'tableauDeBord',
      'demandes',
      'appelsOffres',
      'fiche',
    ]);
    expect(plus.map((l) => l.cle)).toEqual([
      'avis',
      'statistiques',
      'equipe',
      'facturation',
      'compte',
      'aide',
    ]);
  });

  it('comptable : 3 entrées, pas de « Plus »', () => {
    const { onglets, plus } = ongletsMobiles(menuPro(membre('comptable')));
    expect(onglets).toHaveLength(3);
    expect(plus).toEqual([]);
  });
});
