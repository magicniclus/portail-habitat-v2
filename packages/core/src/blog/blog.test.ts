import { describe, expect, it } from 'vitest';
import { droitsDe } from '../paiements';
import {
  adresseArticle,
  articlesAPublier,
  assainirCorps,
  controleSeo,
  creditsArticlesMois,
  lignesExportArticles,
  mentionsBlog,
  statsTexte,
  type ArticleAControler,
} from './index';

const parametres = {
  raisonSociale: 'Durand Plomberie SARL',
  formeJuridique: 'SARL',
  capitalSocial: '10 000 €',
  adresseSiege: '3 rue des Lilas, 33600 Pessac',
  siret: '73282932000074',
  franchiseTva: false,
  tvaSurDebits: false,
  tvaIntra: 'FR12732829320',
  assuranceDecennale: { assureur: 'SMABTP', contrat: 'D-123', zone: 'France' },
  mediateur: { nom: 'Médiateur du bâtiment', adresse: 'Paris' },
  delaiPaiementJours: 30,
};

const mots = (n: number, mot = 'chantier') => Array.from({ length: n }, () => mot).join(' ');
const article = (p: Partial<ArticleAControler> = {}): ArticleAControler => ({
  titre: 'Pompe à chaleur à Pessac : prix et aides en 2026',
  meta: 'Combien coûte une pompe à chaleur à Pessac ? Prix posés, aides MaPrimeRénov’ et conseils pour bien choisir votre installateur RGE local.',
  motCle: 'pompe à chaleur',
  corpsHtml: `<p>La pompe à chaleur est ${mots(20)}.</p><h2>Prix</h2><p>${mots(150)} pompe à chaleur.</p><h2>Aides</h2><p>${mots(150)} <a href="/contact-devis">devis</a> <a href="/realisations">chantiers</a></p>`,
  image: { src: 'lib:r1/0', alt: 'Pompe à chaleur posée à Pessac' },
  categorieId: 'chauffage',
  ...p,
});

describe('adresse de l’article (BLOG §3, §7)', () => {
  it('suit le titre, unique dans le blog', () => {
    expect(adresseArticle('Pompe à chaleur : prix 2026', [])).toBe('pompe-a-chaleur-prix-2026');
    expect(adresseArticle('Pompe à chaleur : prix 2026', ['pompe-a-chaleur-prix-2026'])).toBe(
      'pompe-a-chaleur-prix-2026-2',
    );
    expect(adresseArticle('!!!', [])).toBe('article');
  });
});

describe('assainirCorps (BLOG-09)', () => {
  it('script, iframe, style et attributs d’évènement supprimés', () => {
    const h = assainirCorps(
      '<p onclick="x()">Bonjour<script>alert(1)</script></p><iframe src="https://x"></iframe><style>p{}</style><img src=x onerror=alert(1)>',
    );
    expect(h).toBe('<p>Bonjour</p>');
  });

  it('garde la liste blanche du blog ; lien externe nofollow, lien interne simple', () => {
    const h = assainirCorps(
      '<h2>Titre</h2><h3>Sous</h3><blockquote>c</blockquote><ul><li><strong>a</strong> <em>b</em> <u>c</u></li></ul><a href="https://ex.fr">x</a><a href="/contact">y</a><a href="javascript:alert(1)">z</a><h1>non</h1>',
    );
    expect(h).toBe(
      '<h2>Titre</h2><h3>Sous</h3><blockquote>c</blockquote><ul><li><strong>a</strong> <em>b</em> <u>c</u></li></ul><a href="https://ex.fr" rel="noopener noreferrer nofollow">x</a><a href="/contact">y</a><a>z</a>non',
    );
  });
});

describe('statsTexte', () => {
  it('mots, intertitres, liens internes, mot-clé dans les 100 premiers mots, densité', () => {
    const s = statsTexte(article().corpsHtml, 'pompe à chaleur');
    expect(s.mots).toBeGreaterThan(300);
    expect(s.intertitres).toBe(2);
    expect(s.liensInternes).toBe(2);
    expect(s.motCleAuDebut).toBe(true);
    expect(s.densite).toBeGreaterThan(0);
  });
});

describe('controleSeo (BLOG §3, BLOG-04)', () => {
  const ctx = { mentionsCompletes: true };

  it('article complet : aucun point bloquant', () => {
    const r = controleSeo(article(), ctx);
    expect(r.bloquants).toEqual([]);
    expect(r.score).toBeGreaterThan(50);
  });

  it('méta vide, titre court, mot-clé absent du titre, alt court, sans catégorie, mentions incomplètes : bloquants', () => {
    const r = controleSeo(
      article({ meta: '', titre: 'Court', image: { src: '', alt: 'x' }, categorieId: '' }),
      { mentionsCompletes: false },
    );
    expect(r.bloquants.map((b) => b.cle)).toEqual([
      'titre',
      'meta',
      'motCleTitre',
      'alt',
      'categorie',
      'mentions',
    ]);
  });

  it('sans mot-clé principal : bloquant', () => {
    expect(controleSeo(article({ motCle: '' }), ctx).bloquants.map((b) => b.cle)).toEqual([
      'motCleTitre',
    ]);
  });

  it('recommandations non bloquantes : longueur, mot-clé au début, densité, liens, intertitres', () => {
    const r = controleSeo(article({ corpsHtml: `<p>${mots(50)}</p>` }), ctx);
    expect(r.bloquants).toEqual([]);
    expect(r.recommandations.map((x) => x.cle)).toEqual([
      'titreIdeal',
      'motCleDebut',
      'densite',
      'liensInternes',
      'longueur',
      'intertitres',
    ]);
    expect(
      controleSeo(article({ titre: mots(9, 'pompe à chaleur').slice(0, 60) }), ctx).bloquants,
    ).toEqual([]);
  });
});

describe('mentionsBlog (BLOG §4, BLOG-05)', () => {
  it('lit les paramètres de Devis & factures, sans copie ; complètes', () => {
    const m = mentionsBlog(parametres);
    expect(m.complet).toBe(true);
    expect(m.lignes.find((l) => l.cle === 'decennale')?.texte).toContain('D-123');
    expect(m.lignes.find((l) => l.cle === 'editeur')?.texte).toContain('capital 10 000 €');
    expect(m.lignes.find((l) => l.cle === 'directeur')?.texte).toBe('Durand Plomberie SARL');
  });

  it('décennale ou médiateur manquant : incomplètes, champs nommés', () => {
    const { assuranceDecennale: _d, mediateur: _m, ...reste } = parametres;
    const m = mentionsBlog(reste);
    expect(m.complet).toBe(false);
    expect(m.manquantes).toEqual(['decennale', 'mediateur']);
    expect(mentionsBlog(null).manquantes).toEqual(['editeur', 'siret', 'decennale', 'mediateur']);
  });
});

describe('creditsArticlesMois (D66, BLOG-02, BLOG-14)', () => {
  it('5 en Site Pro et Fiche + Site, 15 en Tout inclus, 0 sans site', () => {
    expect(creditsArticlesMois(droitsDe('site_pro'))).toBe(5);
    expect(creditsArticlesMois(droitsDe('pack_fiche_site'))).toBe(5);
    expect(creditsArticlesMois(droitsDe('tout_inclus'))).toBe(15);
    expect(creditsArticlesMois(droitsDe('fiche_pro'))).toBe(0);
    expect(creditsArticlesMois(droitsDe('gratuit'))).toBe(0);
  });
  it('option Blog (D71) : 5 + 20 = 25 en Site Pro et Fiche + Site', () => {
    expect(creditsArticlesMois(droitsDe('site_pro', true))).toBe(25);
    expect(creditsArticlesMois(droitsDe('pack_fiche_site', true))).toBe(25);
    expect(creditsArticlesMois(droitsDe('tout_inclus', true))).toBe(15);
  });
});

describe('articlesAPublier (planifié → publié)', () => {
  it('seulement les planifiés dont la date est passée', () => {
    const t = Date.UTC(2026, 9, 16, 12);
    expect(
      articlesAPublier(
        [
          { id: 'a', statut: 'planifie', datePublication: t - 1 },
          { id: 'b', statut: 'planifie', datePublication: t + 60_000 },
          { id: 'c', statut: 'brouillon', datePublication: t - 1 },
          { id: 'd', statut: 'planifie' },
        ],
        t,
      ),
    ).toEqual(['a']);
  });
});

describe('lignesExportArticles (BLOG-08)', () => {
  it('une ligne par article, libellés lisibles', () => {
    const l = lignesExportArticles(
      [
        {
          titre: 'PAC',
          slug: 'pac',
          statut: 'publie',
          categorie: 'Chauffage',
          tags: ['aides', 'rge'],
          datePublication: Date.UTC(2026, 9, 1, 8),
          vues: 12,
          auteur: 'Jean',
          genereParIA: true,
        },
      ],
      'durand.portailtravaux.fr',
    );
    expect(l.entetes[0]).toBe('Titre');
    expect(l.lignes).toEqual([
      [
        'PAC',
        'https://durand.portailtravaux.fr/blog/pac',
        'Publié',
        'Chauffage',
        'aides, rge',
        '01/10/2026',
        '12',
        'Jean',
        'Oui',
      ],
    ]);
  });
});
