import { describe, expect, it } from 'vitest';
import {
  accueilPro,
  completudeFiche,
  contenuFiche,
  etapesMiseEnLigne,
  menuPro,
  ongletsCompte,
  ongletsMobiles,
  PAGES_COMPTE,
} from './index';

const membre = (role: 'proprietaire' | 'gerant' | 'collaborateur' | 'comptable') => ({
  role,
  statut: 'actif' as const,
});
const cles = (m: ReturnType<typeof menuPro>) => m.flatMap((s) => s.liens.map((l) => l.cle));

describe('menuPro (D63 : la barre latérale = les outils)', () => {
  it('pastille incitative sur « Ma fiche » tant que la fiche n’est pas en ligne', () => {
    const fiche = (m: ReturnType<typeof menuPro>) =>
      m.flatMap((x) => x.liens).find((l) => l.cle === 'fiche');
    expect(fiche(menuPro(membre('proprietaire'), {}, { fiche: 'À compléter' }))?.alerte).toBe(
      'À compléter',
    );
    expect(fiche(menuPro(membre('proprietaire')))?.alerte).toBeUndefined();
  });

  it('le propriétaire voit tous les outils, groupés comme la maquette', () => {
    const m = menuPro(membre('proprietaire'));
    expect(m.map((s) => s.titre)).toEqual(["Vue d'ensemble", 'Gestion']);
    expect(cles(m)).toEqual([
      'tableauDeBord',
      'fiche',
      'demandes',
      'devis',
      'appelsOffres',
      'avis',
      'site',
      'statistiques',
    ]);
  });

  it('le comptable n’a aucun outil : il passe par Mon compte', () => {
    expect(menuPro(membre('comptable'))).toEqual([]);
  });

  it('badges repris sur les liens, sections vides retirées', () => {
    const m = menuPro(membre('proprietaire'), { demandes: 3, appelsOffres: 0 });
    const liens = m.flatMap((s) => s.liens);
    expect(liens.find((l) => l.cle === 'demandes')?.badge).toBe(3);
    expect(liens.find((l) => l.cle === 'appelsOffres')?.badge).toBeUndefined();
  });

  it('membre suspendu ou absent : aucun outil', () => {
    expect(menuPro(null)).toEqual([]);
    expect(menuPro({ role: 'gerant', statut: 'suspendu' })).toEqual([]);
  });
});

describe('ongletsCompte (NAV-01 : Profil et sécurité · Équipe · Abonnement · Aide & contact)', () => {
  const o = (m: Parameters<typeof ongletsCompte>[0]) => ongletsCompte(m).map((x) => x.cle);
  it('selon le rôle, mêmes onglets sur les quatre pages', () => {
    expect(ongletsCompte(membre('proprietaire')).map((x) => x.libelle)).toEqual([
      'Profil et sécurité',
      'Équipe',
      'Abonnement',
      'Aide & contact',
    ]);
    expect(o(membre('collaborateur'))).toEqual(['compte', 'equipe', 'aide']);
    expect(o(membre('comptable'))).toEqual(['compte', 'facturation', 'aide']);
    expect(o(null)).toEqual(['compte', 'aide']);
  });
  it('pages du compte : le lien épinglé « Mon compte » est actif sur chacune', () => {
    expect(PAGES_COMPTE).toEqual(['compte', 'equipe', 'facturation', 'aide']);
  });
});

describe('accueilPro', () => {
  it('tableau de bord, sauf pour le comptable (abonnement et factures)', () => {
    expect(accueilPro(membre('collaborateur'))).toBe('tableauDeBord');
    expect(accueilPro(membre('comptable'))).toBe('facturation');
    expect(accueilPro(null)).toBe('compte');
  });
});

const vide = { description: '', logo: false, banniere: false };

describe('completudeFiche (logo, description, bannière)', () => {
  it('0 % pour une fiche vide, 100 % avec logo, description et bannière', () => {
    expect(completudeFiche(vide).pourcent).toBe(0);
    expect(
      completudeFiche({ description: 'x'.repeat(20), logo: true, banniere: true }).pourcent,
    ).toBe(100);
  });

  it('chaque élément fait avancer la barre ; il manque le reste', () => {
    expect(completudeFiche({ ...vide, logo: true }).pourcent).toBe(30);
    expect(completudeFiche({ ...vide, banniere: true }).pourcent).toBe(35);
    const c = completudeFiche({ ...vide, description: 'Couvreur depuis 1998 à Bordeaux.' });
    expect(c.pourcent).toBe(35);
    expect(c.criteres.filter((x) => !x.fait).map((x) => x.cle)).toEqual(['logo', 'banniere']);
  });

  it('contenuFiche : lu depuis le document de l’entreprise', () => {
    expect(contenuFiche({})).toEqual(vide);
    expect(contenuFiche({ description: 'd', logoUrl: 'l', bannieres: ['b'] })).toEqual({
      description: 'd',
      logo: true,
      banniere: true,
    });
  });

  it('une description de moins de 20 caractères ne compte pas', () => {
    expect(completudeFiche({ ...vide, description: '  court  ' }).pourcent).toBe(0);
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
  const avecCompte = (m: ReturnType<typeof menuPro>) => [
    ...m,
    { liens: [{ cle: 'compte' as const, libelle: 'Mon compte' }] },
  ];
  it('propriétaire : 4 onglets prioritaires, le reste et Mon compte dans « Plus »', () => {
    const { onglets, plus } = ongletsMobiles(avecCompte(menuPro(membre('proprietaire'))));
    expect(onglets.map((l) => l.cle)).toEqual([
      'tableauDeBord',
      'demandes',
      'appelsOffres',
      'fiche',
    ]);
    expect(plus.map((l) => l.cle)).toEqual(['devis', 'avis', 'site', 'statistiques', 'compte']);
  });

  it('comptable : Mon compte seul, pas de « Plus »', () => {
    const { onglets, plus } = ongletsMobiles(avecCompte(menuPro(membre('comptable'))));
    expect(onglets.map((l) => l.cle)).toEqual(['compte']);
    expect(plus).toEqual([]);
  });
});
