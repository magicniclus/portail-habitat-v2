import { describe, expect, it } from 'vitest';
import {
  controlesSeo,
  couleur,
  erreurSousDomaine,
  etatEnregistrement,
  FORMULAIRE_GRATUIT,
  liensOrphelins,
  normaliserDomaine,
  pageSite,
  navigation,
  prochaineVerification,
  siteParDefaut,
  sousDomaineDe,
  validerAction,
  validerEnvoi,
  verifierLiensSite,
  type ContexteLiens,
} from './index';

// Palette passée par l'appelant (les couleurs vivent dans @ph/ui/tokens).
const PALETTE = {
  primaire: 'primaire',
  accent: 'accent',
  clair: 'clair',
  sombre: 'sombre',
} as const;
const fiche = {
  nomCommercial: 'Bertrand Rénovation',
  metier: 'Plombier',
  ville: 'Bordeaux',
  telephone: '05 56 12 34 56',
  pitch: 'Salle de bain clé en main et dépannage sous 24 h.',
  noteMoyenne: 4.8,
  nbAvis: 14,
  raisonSociale: 'Bertrand Rénovation SARL',
  siret: '81234567800021',
  decennale: 'MAAF, contrat 4521-88',
  photos: ['lib:r1/0', 'lib:r1/1', 'lib:r2/0'],
};

describe('site de départ depuis la fiche (sans IA)', () => {
  const s = siteParDefaut(fiche, PALETTE);

  it('accueil, contact et mentions valides contre les schémas ; navigation valide', () => {
    expect(Object.keys(s.pages)).toEqual(['accueil', 'contact', 'mentions']);
    for (const p of Object.values(s.pages)) expect(pageSite.safeParse(p).success).toBe(true);
    expect(navigation.safeParse(s.navigation).success).toBe(true);
  });

  it('aucun lien cassé au départ (publiable tel quel)', () => {
    expect(verifierLiensSite(s.pages, s.navigation)).toEqual([]);
  });

  it('rien d’inventé : sans avis ni photos, pas de bloc avis ni réalisations', () => {
    const vide = siteParDefaut({ ...fiche, nbAvis: 0, noteMoyenne: 0, photos: [] }, PALETTE);
    const noms = vide.pages.accueil!.sections.map((x) => x.p.nom);
    expect(noms).not.toContain('Avis clients');
    expect(noms).not.toContain('Réalisations');
    expect(JSON.stringify(siteParDefaut(fiche, PALETTE).pages.accueil)).toContain('4,8/5');
  });
});

describe('actions et liens (SITE-09)', () => {
  const ctx: ContexteLiens = {
    pages: { accueil: new Set(['contact']), prestations: new Set() },
    fichiers: new Set(['f1']),
    formulaire: true,
  };
  it('chaque type d’action', () => {
    expect(validerAction({ type: 'page', page: 'prestations' }, ctx, 'accueil')).toBeNull();
    expect(validerAction({ type: 'page', page: 'inconnue' }, ctx, 'accueil')).toBe(
      'Page introuvable',
    );
    expect(validerAction({ type: 'page', page: 'accueil', ancre: 'zz' }, ctx, 'accueil')).toBe(
      'Section introuvable sur la page',
    );
    expect(validerAction({ type: 'ancre', ancre: 'contact' }, ctx, 'accueil')).toBeNull();
    expect(validerAction({ type: 'url', url: 'http://exemple.fr' }, ctx, 'accueil')).toBe(
      'Adresse https:// obligatoire',
    );
    expect(validerAction({ type: 'url', url: 'pas une url' }, ctx, 'accueil')).toBe(
      'Adresse invalide',
    );
    expect(
      validerAction({ type: 'url', url: 'https://www.service-public.fr' }, ctx, 'accueil'),
    ).toBeNull();
    expect(validerAction({ type: 'tel', tel: '05 56 12 34 56' }, ctx, 'accueil')).toBeNull();
    expect(validerAction({ type: 'whatsapp', tel: 'abc' }, ctx, 'accueil')).toBe(
      'Numéro de téléphone invalide',
    );
    expect(validerAction({ type: 'email', email: 'a@b' }, ctx, 'accueil')).toBe(
      'Adresse email invalide',
    );
    expect(validerAction({ type: 'formulaire' }, { ...ctx, formulaire: false }, 'accueil')).toBe(
      'Aucun formulaire sur le site',
    );
    expect(validerAction({ type: 'fichier', fichierId: 'f2' }, ctx, 'accueil')).toBe(
      'Fichier introuvable',
    );
    expect(validerAction({ type: 'aucun' }, ctx, 'accueil')).toBeNull();
  });

  it('mot lié sans destination', () => {
    expect(
      liensOrphelins('Voir [nos aides](#L1) et [contact](#L2)', { L1: { type: 'aucun' } }),
    ).toEqual(['contact']);
  });

  it('un bouton vers une page supprimée bloque la publication avec un message clair', () => {
    const s = siteParDefaut(fiche, PALETTE);
    const { contact: _c, ...sansContact } = s.pages;
    const erreurs = verifierLiensSite(sansContact, s.navigation);
    expect(erreurs).toContainEqual({
      pageId: 'accueil',
      page: 'Navigation',
      ou: 'Menu « Contact »',
      erreur: 'Page introuvable',
    });
    expect(erreurs).toContainEqual({
      pageId: 'accueil',
      page: 'Navigation',
      ou: 'Bouton « Devis gratuit »',
      erreur: 'Page introuvable',
    });
  });

  it('une page en brouillon ne compte pas comme destination', () => {
    const s = siteParDefaut(fiche, PALETTE);
    s.pages.contact!.statut = 'brouillon';
    expect(verifierLiensSite(s.pages, s.navigation).length).toBeGreaterThan(0);
  });
});

describe('couleurs sûres', () => {
  it('jetons, #hex, rgb(), hsl() ; rien d’autre', () => {
    for (const c of [
      'primaire',
      '#1d4f73',
      '#fff',
      'rgb(29, 79, 115)',
      'rgba(0,0,0,.5)',
      'hsl(210, 60%, 28%)',
    ])
      expect(couleur.safeParse(c).success).toBe(true);
    for (const c of [
      'red; background:url(x)',
      'url(javascript:x)',
      'expression(alert(1))',
      '#12345g',
    ])
      expect(couleur.safeParse(c).success).toBe(false);
  });
});

describe('sous-domaine (DOM-01)', () => {
  it('format, tirets et noms réservés', () => {
    expect(erreurSousDomaine('bertrand-renovation')).toBeNull();
    expect(erreurSousDomaine('ab')).toBe('Entre 3 et 40 caractères.');
    expect(erreurSousDomaine('Bertrand')).toBe('Lettres minuscules, chiffres et tirets seulement.');
    expect(erreurSousDomaine('-bertrand')).toBe('Pas de tiret au début ni à la fin.');
    expect(erreurSousDomaine('a--b')).toBe('Pas deux tirets à la suite.');
    expect(erreurSousDomaine('admin')).toBe('Ce nom est réservé, choisissez-en un autre.');
    expect(erreurSousDomaine('plombier')).toBe('Ce nom est réservé, choisissez-en un autre.');
  });
  it('proposition depuis le nom commercial', () => {
    expect(sousDomaineDe('Bertrand Rénovation')).toBe('bertrand-renovation');
    expect(sousDomaineDe('AB')).toBe('ab-artisan');
    expect(erreurSousDomaine(sousDomaineDe('L’Atelier de Léa & Fils'))).toBeNull();
  });
});

describe('formulaire du site', () => {
  const ok = {
    nom: 'Claire Martin',
    telephone: '06 12 34 56 78',
    email: 'claire@test.fr',
    codePostal: '33700',
  };
  it('SITE-13 : site gratuit, champ supplémentaire rejeté', () => {
    expect(validerEnvoi([], 'gratuit', ok)).toEqual({ ok: true, valeurs: ok });
    expect(validerEnvoi([], 'gratuit', { ...ok, budget: '10 000 €' })).toEqual({
      ok: false,
      erreurs: { budget: 'Champ non accepté' },
    });
    expect(FORMULAIRE_GRATUIT.map((c) => c.id)).toEqual([
      'nom',
      'telephone',
      'email',
      'codePostal',
    ]);
  });
  it('Site Pro : champs configurés, requis, types et options', () => {
    const champs = [
      ...FORMULAIRE_GRATUIT,
      {
        id: 'projet',
        type: 'liste' as const,
        libelle: 'Projet',
        requis: true,
        options: ['Salle de bain', 'Chauffage'],
      },
      { id: 'quand', type: 'date' as const, libelle: 'Quand', requis: false },
    ];
    expect(validerEnvoi(champs, 'site_pro', { ...ok, projet: 'Salle de bain' }).ok).toBe(true);
    expect(validerEnvoi(champs, 'site_pro', { ...ok, projet: 'Piscine', quand: '14/10' })).toEqual({
      ok: false,
      erreurs: { projet: 'Choix invalide', quand: 'Valeur invalide' },
    });
    expect(validerEnvoi(champs, 'site_pro', { ...ok, codePostal: '' })).toEqual({
      ok: false,
      erreurs: { codePostal: 'Champ obligatoire', projet: 'Champ obligatoire' },
    });
  });
});

describe('DNS du domaine existant (DOM-04)', () => {
  it('chaque ligne jugée seule ; valeur erronée → incorrect avec la valeur trouvée', () => {
    expect(etatEnregistrement({ type: 'A', nom: '@', valeur: '76.76.21.21' }, [])).toEqual({
      etat: 'en_attente',
    });
    expect(
      etatEnregistrement({ type: 'A', nom: '@', valeur: '76.76.21.21' }, ['76.76.21.21']),
    ).toEqual({ etat: 'ok' });
    expect(
      etatEnregistrement({ type: 'A', nom: '@', valeur: '76.76.21.21' }, [
        '76.76.21.21',
        '1.2.3.4',
      ]),
    ).toEqual({ etat: 'incorrect', trouve: '76.76.21.21, 1.2.3.4' });
    expect(
      etatEnregistrement({ type: 'CNAME', nom: 'www', valeur: 'cname.vercel-dns.com.' }, [
        'CNAME.vercel-dns.com',
      ]),
    ).toEqual({ etat: 'ok' });
    expect(
      etatEnregistrement({ type: 'CNAME', nom: 'www', valeur: 'cname.vercel-dns.com.' }, [
        'ghs.google.com.',
      ]),
    ).toEqual({ etat: 'incorrect', trouve: 'ghs.google.com' });
    expect(
      etatEnregistrement({ type: 'TXT', nom: '_portailtravaux', valeur: 'ph-verif=abc' }, [
        '"v=spf1 -all"',
        '"ph-verif=abc"',
      ]),
    ).toEqual({ etat: 'ok' });
    expect(
      etatEnregistrement({ type: 'TXT', nom: '_portailtravaux', valeur: 'ph-verif=abc' }, [
        'ph-verif=ABC',
      ]),
    ).toEqual({ etat: 'incorrect', trouve: 'ph-verif=ABC' });
  });
  it('rythme : 2 min pendant 1 h, 30 min jusqu’à 72 h, puis arrêt', () => {
    expect(prochaineVerification(10 * 60_000)).toBe(120_000);
    expect(prochaineVerification(5 * 3_600_000)).toBe(1_800_000);
    expect(prochaineVerification(73 * 3_600_000)).toBeNull();
  });
  it('domaine saisi normalisé ; le nôtre refusé', () => {
    expect(normaliserDomaine(' https://WWW.Bertrand-Renovation.fr/accueil ')).toBe(
      'bertrand-renovation.fr',
    );
    expect(normaliserDomaine('bertrand')).toBeNull();
    expect(normaliserDomaine('x.portailtravaux.fr')).toBeNull();
  });
});

describe('SEO de page', () => {
  it('contrôles et score', () => {
    const p = siteParDefaut(fiche, PALETTE).pages.accueil!;
    const r = controlesSeo(p, 'Bordeaux');
    expect(r.controles.find((c) => c.cle === 'h1')?.ok).toBe(true);
    expect(r.controles.find((c) => c.cle === 'ville')?.ok).toBe(true);
    expect(r.controles.find((c) => c.cle === 'alt')?.ok).toBe(true);
    expect(
      controlesSeo({ ...p, seo: { ...p.seo, title: 'Court' } }).controles.find(
        (c) => c.cle === 'title',
      )?.ok,
    ).toBe(false);
    expect(r.score).toBeGreaterThanOrEqual(60);
  });
});

describe('libellés du site', () => {
  it('score SEO et état de publication', async () => {
    const { libelleScoreSeo, etatPublication, STATUTS_PAGE } = await import('./libelles');
    expect(libelleScoreSeo(100).tone).toBe('succes');
    expect(libelleScoreSeo(60).tone).toBe('attention');
    expect(libelleScoreSeo(20).tone).toBe('danger');
    expect(etatPublication({ modifie: true }).libelle).toBe('Pas encore publié');
    expect(etatPublication({ versionPubliee: 2, modifie: true }).tone).toBe('attention');
    expect(etatPublication({ versionPubliee: 2, modifie: false }).libelle).toBe('En ligne');
    expect(STATUTS_PAGE.publiee.tone).toBe('succes');
  });
});
