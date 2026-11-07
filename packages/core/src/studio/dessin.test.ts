import { describe, expect, it } from 'vitest';
import { dessinerCalques, dessinerSousTitre, progression, type Contexte2D } from './dessin';
import type { Calque } from './plan';

/** Faux canevas : garde les textes écrits. */
function faux(): Contexte2D & { textes: string[] } {
  const textes: string[] = [];
  const rien = () => {};
  return {
    textes,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: 'miter',
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    globalAlpha: 1,
    shadowColor: '',
    shadowBlur: 0,
    save: rien,
    restore: rien,
    translate: rien,
    scale: rien,
    beginPath: rien,
    moveTo: rien,
    lineTo: rien,
    closePath: rien,
    arc: rien,
    fill: rien,
    stroke: rien,
    fillRect: rien,
    fillText: (t: string) => void textes.push(t),
    strokeText: rien,
    measureText: (t: string) => ({ width: t.length * 30 }),
  };
}
const theme = {
  accent: 'a',
  accentTexte: 'b',
  sombre: 'c',
  clair: 'd',
  succes: 'e',
  police: 'sans-serif',
};
const zone = { x: 0, y: 0, largeur: 1080, hauteur: 1920 };

describe('calques 2D', () => {
  it('invisible hors de son intervalle, entre puis sort', () => {
    expect(progression(50, 100, 1000).alpha).toBe(0);
    expect(progression(1000, 100, 1000).alpha).toBe(0);
    expect(progression(600, 100, 1000)).toEqual({ entree: 1, alpha: 1 });
    expect(progression(900, 100, 1000).alpha).toBeCloseTo(0.5);
  });

  it('le compteur défile puis s’arrête sur sa valeur', () => {
    const c: Calque[] = [
      {
        type: 'compteur',
        de: 0,
        a: 10,
        libelle: 'demandes par mois',
        position: 'centre',
        debut: 0,
        fin: 3000,
      },
    ];
    const debut = faux();
    dessinerCalques(debut, c, 10, 'vertical', zone, theme);
    expect(debut.textes[0]).toBe('0');
    const fin = faux();
    dessinerCalques(fin, c, 2500, 'vertical', zone, theme);
    expect(fin.textes).toEqual(['10', 'demandes par mois']);
  });

  it('montant en euros depuis des centimes', () => {
    const fin = faux();
    dessinerCalques(
      fin,
      [
        {
          type: 'compteur',
          de: 0,
          a: 1_250_000,
          euros: true,
          libelle: 'ce mois',
          position: 'haut',
          debut: 0,
          fin: 3000,
        },
      ],
      2900,
      'vertical',
      zone,
      theme,
    );
    expect(fin.textes[0]?.replace(/\s/g, ' ')).toBe('12 500 €');
  });

  it('chaque type se dessine sans erreur', () => {
    const tous: Calque[] = [
      {
        type: 'texte',
        texte: 'Des clients gratuitement',
        style: 'accroche',
        position: 'haut',
        debut: 0,
        fin: 2000,
      },
      {
        type: 'notification',
        titre: 'Nouvelle demande',
        texte: 'Salle de bain à Mérignac',
        debut: 0,
        fin: 2000,
      },
      {
        type: 'liste',
        elements: ['Fiche', 'Site', 'Devis'],
        position: 'centre',
        debut: 0,
        fin: 2000,
      },
      {
        type: 'barre',
        libelle: 'Fiche complète',
        valeur: 80,
        position: 'bas',
        debut: 0,
        fin: 2000,
      },
      { type: 'fleche', x: 0.5, y: 0.5, debut: 0, fin: 2000 },
      { type: 'surlignage', x: 0.1, y: 0.1, largeur: 0.5, hauteur: 0.2, debut: 0, fin: 2000 },
    ];
    const ctx = faux();
    dessinerCalques(
      ctx,
      tous,
      1500,
      'horizontal',
      { x: 0, y: 0, largeur: 1920, hauteur: 1080 },
      theme,
    );
    expect(ctx.textes).toContain('Nouvelle demande');
    expect(ctx.textes).toContain('Devis');
  });

  it('sous-titre en majuscules, uniquement pendant la ligne', () => {
    const ligne = { debut: 100, fin: 900, mots: [{ texte: 'gratuit', debut: 100, fin: 900 }] };
    const ctx = faux();
    dessinerSousTitre(ctx, ligne, 50, 'vertical', 1280, theme);
    expect(ctx.textes).toEqual([]);
    dessinerSousTitre(ctx, ligne, 500, 'vertical', 1280, theme);
    expect(ctx.textes).toEqual(['GRATUIT']);
  });
});

describe('image complète', () => {
  it('carton, calque et sous-titre au bon moment ; écran posé dans son cadre', async () => {
    const { dessinerImage, basSousTitres } = await import('./image');
    const plan = {
      format: 'vertical' as const,
      titre: 't',
      plans: [
        {
          id: 'a',
          source: { debut: 0, fin: 2000 },
          visuel: 'carton' as const,
          carton: 'Stop !',
          camera: 'cachee' as const,
          calques: [],
        },
        {
          id: 'b',
          source: { debut: 3000, fin: 9000 },
          visuel: 'ecran' as const,
          camera: 'bas' as const,
          calques: [],
        },
      ],
      captures: [],
      artisan: null,
      sousTitres: true,
      musique: false,
    };
    const images: unknown[][] = [];
    const ctx = Object.assign(faux(), { drawImage: (...a: unknown[]) => void images.push(a) });
    const lignes = [
      { debut: 2500, fin: 3500, mots: [{ texte: 'gratuit', debut: 2500, fin: 3500 }] },
    ];
    const th = { ...theme, fond: 'f' };
    dessinerImage(ctx, plan, 1000, { captures: {} }, lignes, th);
    expect(ctx.textes).toContain('Stop !');
    dessinerImage(
      ctx,
      plan,
      3000,
      { ecran: { image: 'E', largeur: 1920, hauteur: 1080 }, captures: {} },
      lignes,
      th,
    );
    expect(images.at(-1)?.slice(0, 1)).toEqual(['E']);
    expect(images.at(-1)?.slice(5)).toEqual([0, 0, 1080, 1280]);
    expect(ctx.textes).toContain('GRATUIT');
    expect(basSousTitres(plan, 3000)).toBe(1280);
  });
});

describe('miniature', () => {
  it('texte en majuscules, mot mis en avant en couleur d’accent', async () => {
    const { dessinerMiniature } = await import('./dessin');
    const couleurs: unknown[] = [];
    const ctx = faux();
    const f = ctx.fillText;
    ctx.fillText = (t: string, x: number, y: number) => {
      couleurs.push([t, ctx.fillStyle]);
      f(t, x, y);
    };
    dessinerMiniature(ctx, { texte: '10 clients gratuits', accent: 'gratuits' }, 'vertical', theme);
    expect(couleurs).toEqual([
      ['10', 'd'],
      ['CLIENTS', 'd'],
      ['GRATUITS', 'a'],
    ]);
  });

  it('texte trop long : plus petit, 3 lignes au plus', async () => {
    const { dessinerMiniature } = await import('./dessin');
    const ctx = faux();
    dessinerMiniature(
      ctx,
      { texte: 'un deux trois quatre cinq six sept huit neuf dix', accent: '' },
      'carre',
      theme,
    );
    expect(ctx.textes.length).toBe(10);
  });
});
