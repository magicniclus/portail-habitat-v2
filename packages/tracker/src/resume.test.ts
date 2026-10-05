import { describe, expect, it } from 'vitest';
import { creerResume, type ContexteVisite } from './resume';

const ctx = (surcharge: Partial<ContexteVisite> = {}): ContexteVisite => ({
  sessionId: 'abcdefgh12345678',
  vueId: '12345678abcdefgh',
  page: 'acquisition-artisans',
  app: 'pro',
  largeur: 1440,
  source: 'direct',
  nouvelle: true,
  debut: 1000,
  trajets: false,
  replay: false,
  ...surcharge,
});
const lien = { cle: 'cta-hero', cliquable: true, suivi: 'cta-hero' };
const image = { cle: 'hero>img:1', cliquable: false };

describe('creerResume', () => {
  it('résume une visite vide', () => {
    const r = creerResume(ctx()).resume(4000);
    expect(r).toMatchObject({
      v: 1,
      appareil: 'ordinateur',
      duree: 3000,
      profondeur: 0,
      cellulesClics: {},
      sortie: { section: '', type: 'fermeture', intention: false },
    });
    expect(r.trajet).toBeUndefined();
    expect(r.replay).toBeUndefined();
  });

  it('place les clics sur la mise en page de référence (1280 px)', () => {
    const c = creerResume(ctx());
    c.clic(1100, 720, 45, 1440, lien);
    c.clic(1200, 720, 45, 1440, lien);
    const r = c.resume(2000);
    expect(r.cellulesClics).toEqual({ '32:2': 2 });
    expect(r.elements['cta-hero']).toEqual({ survolMs: 0, clics: 2 });
  });

  it('ne compte pas la position d’un clic au clavier', () => {
    const c = creerResume(ctx());
    c.clic(1100, 0, 0, 1440, lien, false);
    const r = c.resume(2000);
    expect(r.cellulesClics).toEqual({});
    expect(r.elements['cta-hero']!.clics).toBe(1);
  });

  it('relève les clics morts une fois par élément', () => {
    const c = creerResume(ctx());
    c.clic(1100, 100, 100, 1440, image);
    c.clic(5000, 100, 100, 1440, image);
    expect(c.resume(6000).morts).toEqual(['hero>img:1']);
  });

  it('détecte un clic de rage : 3 clics en 700 ms dans 30 px', () => {
    const c = creerResume(ctx());
    c.clic(1000, 100, 100, 1440, image);
    c.clic(1200, 110, 105, 1440, image);
    c.clic(1500, 95, 100, 1440, image);
    c.clic(1600, 100, 100, 1440, image);
    const r = c.resume(2000);
    expect(r.rages).toEqual(['hero>img:1']);
    expect(r.replay).toBeDefined();
  });

  it('ignore des clics trop espacés ou trop éloignés', () => {
    const c = creerResume(ctx());
    c.clic(1000, 100, 100, 1440, image);
    c.clic(1300, 300, 100, 1440, image);
    c.clic(1600, 100, 100, 1440, image);
    c.clic(2400, 100, 100, 1440, image);
    expect(c.resume(3000).rages).toEqual([]);
  });

  it('pondère l’attention par la durée des arrêts d’au moins 600 ms', () => {
    const c = creerResume(ctx());
    c.position(1000, 100, 100, 1440);
    c.position(1500, 200, 100, 1440);
    c.position(2500, 300, 100, 1440);
    const r = c.resume(2600);
    expect(r.cellulesAttention).toEqual({ '8:5': 1000 });
  });

  it('compte un arrêt final et le plafonne à 30 s', () => {
    const c = creerResume(ctx());
    c.position(1000, 100, 100, 1440);
    expect(c.resume(100_000).cellulesAttention).toEqual({ '4:5': 30_000 });
  });

  it('compte une hésitation : arrêt de 2 s sur un élément suivi sans clic dans les 5 s', () => {
    const c = creerResume(ctx());
    c.position(1000, 100, 100, 1440, () => 'prix-visibilite');
    c.position(3500, 400, 400, 1440);
    expect(c.resume(9000).elements['prix-visibilite']).toEqual({
      survolMs: 0,
      clics: 0,
      hesitations: 1,
    });
  });

  it('annule l’hésitation si l’élément est cliqué dans les 5 s', () => {
    const c = creerResume(ctx());
    c.position(1000, 100, 100, 1440, () => 'cta-hero');
    c.position(3500, 100, 100, 1440);
    c.clic(4000, 100, 100, 1440, lien);
    expect(c.resume(9000).elements['cta-hero']!.hesitations).toBeUndefined();
  });

  it('garde un trajet simplifié seulement si la session est tirée au sort', () => {
    const avec = creerResume(ctx({ trajets: true }));
    const sans = creerResume(ctx());
    for (let i = 0; i < 200; i++) {
      avec.position(1000 + i * 120, i * 5, (i * 37) % 400, 1440);
      sans.position(1000 + i * 120, i * 5, (i * 37) % 400, 1440);
    }
    expect(avec.resume(40_000).trajet!.length).toBe(80);
    expect(sans.resume(40_000).trajet).toBeUndefined();
  });

  it('n’enregistre ni trajet ni attention sur mobile', () => {
    const c = creerResume(ctx({ largeur: 390, trajets: true }));
    c.position(1000, 10, 10, 390);
    c.position(3000, 100, 100, 390);
    const r = c.resume(4000);
    expect(r.appareil).toBe('mobile');
    expect(r.trajet).toBeUndefined();
    expect(r.cellulesAttention).toEqual({});
  });

  it('suit la profondeur maximale et la hauteur du document', () => {
    const c = creerResume(ctx({ replay: true }));
    c.defilement(1100, 1800, 3000, 900);
    c.defilement(1200, 1200, 3000, 300);
    const r = c.resume(2000);
    expect(r.profondeur).toBe(60);
    expect(r.hauteur).toBe(3000);
    expect(r.replay).toEqual([
      [100, 2, 0, 900],
      [200, 2, 0, 300],
    ]);
  });

  it('cumule le temps par section, les survols et la dernière section vue', () => {
    const c = creerResume(ctx());
    c.section('hero', 4000);
    c.section('hero', 1000);
    c.sectionVisible('offres');
    c.survol('cta-hero', 800);
    c.survol('cta-hero', 0);
    const r = c.resume(9000);
    expect(r.sections).toEqual({ hero: 5000 });
    expect(r.elements['cta-hero']!.survolMs).toBe(800);
    expect(r.sortie.section).toBe('offres');
  });

  it('relève l’abandon de formulaire et garde le replay', () => {
    const c = creerResume(ctx());
    c.champ('email', 3000);
    c.champ('telephone', 1000);
    const r = c.resume(9000);
    expect(r.champs).toEqual({ email: 3000, telephone: 1000 });
    expect(r.abandon).toBe('telephone');
    expect(r.replay).toEqual([]);
  });

  it('ne parle pas d’abandon après envoi du formulaire ou conversion', () => {
    const envoye = creerResume(ctx());
    envoye.champ('email', 3000);
    envoye.formulaireEnvoye();
    expect(envoye.resume(9000).abandon).toBeUndefined();
    const converti = creerResume(ctx());
    converti.champ('email', 3000);
    converti.conversion('inscription');
    const r = converti.resume(9000);
    expect(r.abandon).toBeUndefined();
    expect(r.conversion).toBe('inscription');
    expect(r.sortie.type).toBe('conversion');
  });

  it('retient un type de sortie récent et l’intention de sortie', () => {
    const c = creerResume(ctx());
    c.sortie('lien_externe', 8000);
    c.intention();
    expect(c.resume(9000).sortie).toEqual({ section: '', type: 'lien_externe', intention: true });
    const ancien = creerResume(ctx());
    ancien.sortie('navigation', 2000);
    expect(ancien.resume(9000).sortie.type).toBe('fermeture');
  });

  it('plafonne les événements du replay', () => {
    const c = creerResume(ctx({ replay: true }));
    for (let i = 0; i < 2500; i++) c.position(1000 + i * 100, (i % 2) * 50, 100, 1440);
    expect(c.resume(300_000).replay).toHaveLength(2000);
  });
});

describe('envois successifs', () => {
  it('un envoi de secours ne compte pas deux fois l’arrêt en cours', () => {
    const c = creerResume(ctx());
    c.position(1000, 100, 100, 1440, () => 'cta-hero');
    c.resume(4000);
    const r = c.resume(5000);
    expect(r.cellulesAttention).toEqual({ '4:5': 4000 });
    expect(r.elements['cta-hero']!.hesitations).toBe(1);
  });
});
