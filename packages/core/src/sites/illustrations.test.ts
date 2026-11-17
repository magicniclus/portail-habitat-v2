import { describe, expect, it } from 'vitest';
import {
  ILLUSTRATIONS,
  illustrationDe,
  illustrationsDuMetier,
  svgIllustration,
  urlIllustration,
} from './illustrations';
import { media } from './schemas';

const PALETTE = { primaire: '#12355b', accent: '#2b7fd4', clair: '#eef3f8', sombre: '#0b1c2e' };

describe('illustrations des sites', () => {
  it('le métier choisit le dessin du bandeau et trois dessins voisins', () => {
    expect(illustrationsDuMetier('Plombier')).toEqual({
      bandeau: 'ill:salle-de-bain',
      galerie: ['ill:salle-de-bain', 'ill:cuisine', 'ill:chauffage'],
    });
    expect(illustrationsDuMetier('Couvreur zingueur').bandeau).toBe('ill:toiture');
    expect(illustrationsDuMetier('Électricien').bandeau).toBe('ill:electricite');
    expect(illustrationsDuMetier('Peintre en bâtiment').bandeau).toBe('ill:peinture');
    expect(illustrationsDuMetier('Paysagiste').bandeau).toBe('ill:jardin');
    expect(illustrationsDuMetier('Maçon').bandeau).toBe('ill:maconnerie');
    expect(illustrationsDuMetier('Chauffagiste').bandeau).toBe('ill:chauffage');
    expect(illustrationsDuMetier('Menuisier').bandeau).toBe('ill:menuiserie');
    expect(illustrationsDuMetier('Cuisiniste').bandeau).toBe('ill:cuisine');
    // Métier inconnu : la rénovation générale.
    expect(illustrationsDuMetier('Multiservices').bandeau).toBe('ill:renovation');
  });

  it('chaque dessin est un SVG aux seules couleurs de la palette (plus le blanc)', () => {
    for (const i of ILLUSTRATIONS) {
      const svg = svgIllustration(i, PALETTE);
      expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 1200 800"/);
      const couleurs = new Set(svg.match(/#[0-9a-f]{6}/gi));
      for (const c of couleurs) expect(Object.values(PALETTE)).toContain(c);
      expect(svg).not.toMatch(/<script|on\w+=/i);
    }
  });

  it('média `ill:` accepté par le schéma ; adresse data: utilisable dans une image', () => {
    expect(media.safeParse('ill:cuisine').success).toBe(true);
    expect(media.safeParse('ill:Cuisine<').success).toBe(false);
    expect(illustrationDe('ill:cuisine')).toBe('cuisine');
    expect(illustrationDe('ill:inconnue')).toBeNull();
    expect(illustrationDe('lib:a/1')).toBeNull();
    expect(urlIllustration('cuisine', PALETTE)).toMatch(
      /^data:image\/svg\+xml;charset=utf-8,%3Csvg/,
    );
  });
});
