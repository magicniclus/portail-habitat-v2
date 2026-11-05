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
