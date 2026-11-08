import { describe, expect, it } from 'vitest';
import { ENTREES } from './catalogue';
import {
  dessinerCalques,
  dessinerSousTitre,
  entreeAnimee,
  progression,
  type Contexte2D,
} from './dessin';
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
    rotate: rien,
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

describe('scènes animées et entrées', () => {
  const scenes: Calque[] = [
    {
      type: 'demandes',
      elements: [
        { titre: 'Salle de bain', ville: 'Mérignac' },
        { titre: 'Toiture', ville: 'Talence' },
      ],
      position: 'centre',
      debut: 0,
      fin: 4_000,
    },
    {
      type: 'outils',
      elements: ['Fiche pro', 'Devis et factures en un clic'],
      position: 'centre',
      debut: 0,
      fin: 4_000,
    },
    { type: 'tampon', texte: 'gratuit', position: 'centre', debut: 0, fin: 3_000 },
    {
      type: 'comparaison',
      avant: 'Des commissions',
      apres: '0 € de commission',
      debut: 0,
      fin: 4_000,
    },
    { type: 'fin', titre: 'Inscrivez-vous', bouton: 'portail-travaux.fr', debut: 0, fin: 3_000 },
  ];

  it('chaque scène arrive puis montre tous ses textes', () => {
    for (const largeur of [1080, 1920]) {
      const z = { x: 0, y: 0, largeur, hauteur: 1080 };
      const tot = faux();
      dessinerCalques(tot, scenes, 10, 'vertical', z, theme);
      // Au tout début, les éléments en file d'attente ne sont pas encore là.
      expect(tot.textes).not.toContain('Toiture');
      const ctx = faux();
      dessinerCalques(ctx, scenes, 2_900, 'vertical', z, theme);
      for (const t of [
        'NOUVELLE DEMANDE',
        'Salle de bain',
        'Toiture',
        'Mérignac',
        'Fiche pro',
        'GRATUIT',
        'AVANT',
        'APRÈS',
        'Inscrivez-vous',
        'portail-travaux.fr',
      ])
        expect(ctx.textes).toContain(t);
    }
  });

  it('entrées : chaque type part d’un état et arrive à l’image normale', () => {
    for (const e of ENTREES) {
      const debut = entreeAnimee(e, 0);
      const fin = entreeAnimee(e, 2_000);
      expect(fin).toEqual({ dx: 0, dy: 0, echelle: 1, angle: 0, alpha: 1 });
      expect(debut.dx !== 0 || debut.dy !== 0 || debut.echelle !== 1 || debut.alpha < 1).toBe(true);
    }
    expect(entreeAnimee('monte', 0).dy).toBe(90);
    expect(entreeAnimee('tampon', 0).echelle).toBeCloseTo(2.2);
    // Un calque avec une entrée choisie se dessine (et tourne pour le tampon).
    let tours = 0;
    const ctx = { ...faux(), rotate: () => void tours++ };
    dessinerCalques(
      ctx,
      [
        {
          type: 'texte',
          texte: 'Bonjour',
          style: 'titre',
          position: 'haut',
          debut: 0,
          fin: 2_000,
          entree: 'tampon',
        },
        { type: 'tampon', texte: 'ok', position: 'bas', debut: 0, fin: 2_000, entree: 'glisse' },
      ],
      100,
      'vertical',
      zone,
      theme,
    );
    expect(ctx.textes).toEqual(expect.arrayContaining(['Bonjour', 'OK']));
    expect(tours).toBe(2);
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
