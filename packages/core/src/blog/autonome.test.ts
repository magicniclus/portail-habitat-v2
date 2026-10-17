import { describe, expect, it } from 'vitest';
import {
  completerLiensInternes,
  corrigerSeoAuto,
  dateSelonTendance,
  motCleDejaUtilise,
  normaliserMotCle,
  prochainePublicationPilote,
  rythmePermis,
  RYTHMES_PILOTE,
} from './autonome';
import { controleSeo } from './seo';

const JOUR = 86_400_000;
const T = Date.UTC(2026, 9, 17, 10);

describe('mots-clés du pilote (BLOG-13 : jamais deux fois le même)', () => {
  it('comparaison sans accents, casse ni espaces en trop', () => {
    expect(normaliserMotCle('  Pompe à  Chaleur ')).toBe('pompe a chaleur');
    expect(motCleDejaUtilise('pompe a chaleur', ['Pompe à chaleur', 'chaudière'])).toBe(true);
    expect(motCleDejaUtilise('poêle à bois', ['Pompe à chaleur'])).toBe(false);
    expect(motCleDejaUtilise('', ['x'])).toBe(false);
  });
});

describe('rythmes du pilote (BLOG §2 bis, BLOG-13)', () => {
  it('2 par semaine réservé à Tout inclus', () => {
    expect(rythmePermis('2_semaine', 'site_pro')).toBe(false);
    expect(rythmePermis('2_semaine', 'tout_inclus')).toBe(true);
    expect(rythmePermis('1_semaine', 'pack_fiche_site')).toBe(true);
    expect(rythmePermis('2_mois', 'fiche_pro')).toBe(false);
  });
  it('prochaine publication : après la précédente, jamais moins de 48 h + 1 jour plus tard', () => {
    expect(RYTHMES_PILOTE['1_semaine'].jours).toBe(7);
    const premiere = prochainePublicationPilote(null, '1_semaine', T);
    expect(premiere).toBeGreaterThanOrEqual(T + 3 * JOUR);
    expect(new Date(premiere).getUTCHours()).toBe(6); // 8 h à Paris en heure d'été
    const suivante = prochainePublicationPilote(premiere, '1_semaine', T);
    expect(suivante - premiere).toBe(7 * JOUR);
    // Précédente très ancienne : on repart de maintenant.
    expect(prochainePublicationPilote(T - 90 * JOUR, '2_mois', T)).toBeGreaterThanOrEqual(
      T + 3 * JOUR,
    );
  });
});

describe('date selon la tendance (BLOG-11 : le mois avant le pic)', () => {
  it('pic en mars → 1er février à 8 h', () => {
    const tendance = [10, 20, 90, 30, 10, 5, 5, 5, 5, 5, 5, 5];
    const d = new Date(dateSelonTendance(tendance, T));
    expect([d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()]).toEqual([2027, 1, 1]);
  });
  it('pic en décembre → 1er novembre de cette année', () => {
    const tendance = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 99];
    const d = new Date(dateSelonTendance(tendance, T));
    expect([d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()]).toEqual([2026, 10, 1]);
  });
  it('sans tendance ou date trop proche : dans 7 jours', () => {
    const d = dateSelonTendance(null, T);
    expect(d).toBeGreaterThanOrEqual(T + 7 * JOUR - JOUR);
    expect(d).toBeLessThanOrEqual(T + 8 * JOUR);
    // Pic en novembre → 1er octobre, déjà passé : dans 7 jours plutôt qu'un an plus tard.
    const nov = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 99, 5];
    expect(dateSelonTendance(nov, T)).toBeLessThan(T + 8 * JOUR);
  });
});

describe('liens internes (BLOG-10 : 3 liens réellement dans le texte)', () => {
  const liens = [
    { url: '/', titre: 'Accueil' },
    { url: '/contact-devis', titre: 'Demander un devis' },
    { url: '/blog/chaudiere', titre: 'Changer sa chaudière' },
    { url: '/blog/pac', titre: 'Pompe à chaleur' },
  ];
  it('complète jusqu’à 3 liens relatifs, sans doublon', () => {
    const html = completerLiensInternes('<p>Voir <a href="/contact-devis">devis</a>.</p>', liens);
    expect(html.match(/href="\//g)).toHaveLength(3);
    expect(html.match(/contact-devis/g)).toHaveLength(1);
    expect(html).toContain('<h2>Pour aller plus loin</h2>');
  });
  it('rien à ajouter si 3 liens sont déjà là ; échappement des titres', () => {
    const plein = '<p><a href="/a">a</a><a href="/b">b</a><a href="/c">c</a></p>';
    expect(completerLiensInternes(plein, liens)).toBe(plein);
    expect(completerLiensInternes('<p>x</p>', [{ url: '/x', titre: 'A & <b>' }])).toContain(
      'A &amp; &lt;b&gt;',
    );
  });
});

describe('corrections SEO automatiques (BLOG-10 : 0 point bloquant)', () => {
  const ok = { mentionsCompletes: true };
  it('titre trop long sans mot-clé, méta trop courte, texte alternatif vide', () => {
    const a = corrigerSeoAuto({
      titre: 'Tout ce qu’il faut savoir avant de changer votre vieux système de chauffage',
      sousTitre: 'Prix, aides et délais : nos conseils d’artisan pour bien choisir.',
      meta: 'Nos conseils.',
      motCle: 'pompe à chaleur',
      corpsHtml: '<p>Texte</p>',
      image: { src: 'lib:r1/0', alt: '' },
      categorieId: 'c1',
    });
    const seo = controleSeo(a, ok);
    expect(seo.bloquants).toEqual([]);
    expect(a.titre.toLowerCase()).toContain('pompe à chaleur');
    expect(a.titre.length).toBeLessThanOrEqual(70);
    expect(a.meta.length).toBeGreaterThanOrEqual(120);
    expect(a.meta.length).toBeLessThanOrEqual(160);
  });
  it('méta trop longue coupée au mot, « … » final', () => {
    const a = corrigerSeoAuto({
      titre: 'Pompe à chaleur : le guide',
      sousTitre: '',
      meta: 'mot '.repeat(60),
      motCle: 'pompe à chaleur',
      corpsHtml: '',
      image: { src: '', alt: 'Une pompe à chaleur installée' },
      categorieId: 'c1',
    });
    expect(a.meta.length).toBeLessThanOrEqual(160);
    expect(a.meta.endsWith('…')).toBe(true);
  });
});
