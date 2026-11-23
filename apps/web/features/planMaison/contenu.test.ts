import { describe, expect, it } from 'vitest';
import {
  FAMILLES_GUIDES,
  FAQ_LANDING,
  GUIDES_PLAN,
  guideParSlug,
  LANDING_PLAN,
  PARTIES_LANDING,
} from './contenu';

const MARQUE = ' · Portail Travaux';
const pages = [LANDING_PLAN, ...GUIDES_PLAN];

describe('landing et guides « plan de maison gratuit »', () => {
  it('chaque balise title tient dans 65 signes avec la marque', () => {
    for (const p of pages) expect((p.titre + MARQUE).length).toBeLessThanOrEqual(65);
  });

  it('chaque description fait entre 120 et 165 signes', () => {
    for (const p of pages) {
      expect(p.description.length).toBeGreaterThanOrEqual(120);
      expect(p.description.length).toBeLessThanOrEqual(165);
    }
  });

  it('titres, descriptions, H1 et slugs sont tous différents (pas de contenu dupliqué)', () => {
    for (const cle of ['titre', 'description', 'h1'] as const)
      expect(new Set(pages.map((p) => p[cle])).size).toBe(pages.length);
    expect(new Set(GUIDES_PLAN.map((g) => g.slug)).size).toBe(GUIDES_PLAN.length);
  });

  it('chaque page vise « plan » et reste gratuite dans son titre', () => {
    for (const p of pages) expect(p.titre.toLowerCase()).toMatch(/plan/);
    for (const p of pages) expect(`${p.titre} ${p.description}`.toLowerCase()).toMatch(/gratuit/);
  });

  it('assez de contenu : 3 parties et 4 questions par guide, 10 questions sur la landing', () => {
    expect(FAQ_LANDING.length).toBeGreaterThanOrEqual(10);
    expect(PARTIES_LANDING.length).toBeGreaterThanOrEqual(4);
    for (const g of GUIDES_PLAN) {
      expect(g.parties.length).toBeGreaterThanOrEqual(3);
      expect(g.faq.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('slugs en minuscules sans accent, retrouvés par guideParSlug', () => {
    for (const g of GUIDES_PLAN) {
      expect(g.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(guideParSlug(g.slug)).toBe(g);
    }
    expect(guideParSlug('inconnu')).toBeUndefined();
  });

  it('jamais le mot « lead », aucun avis ni pourcentage', () => {
    const tout = JSON.stringify([LANDING_PLAN, PARTIES_LANDING, FAQ_LANDING, GUIDES_PLAN]);
    expect(tout.toLowerCase()).not.toMatch(/\blead/);
    expect(tout).not.toMatch(/\d+ ?%|★|avis client/);
  });

  it('chaque famille regroupe au moins deux guides (maillage entre voisins)', () => {
    for (const f of Object.keys(FAMILLES_GUIDES))
      expect(GUIDES_PLAN.filter((g) => g.famille === f).length).toBeGreaterThanOrEqual(2);
  });
});
