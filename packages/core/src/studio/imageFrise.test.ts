import { describe, expect, it } from 'vitest';
import {
  clipsActifs,
  cleSource,
  creerFrise,
  dessinerCarton,
  dessinerFrise,
  dessinerSurcoucheFrise,
  motsFrise,
  rectangleClip,
  filtreCss,
  poserClip,
  modifierPiste,
  tempsSource,
  type Clip,
  type ContexteImage,
} from './index';

const theme = {
  accent: '#f00',
  accentTexte: '#fff',
  sombre: '#000',
  clair: '#fff',
  succes: '#0f0',
  police: 'x',
  fond: '#111',
};

function faux() {
  const appels: string[] = [];
  const ctx = new Proxy({ globalAlpha: 1, filter: 'none' } as Record<string, unknown>, {
    get(cible, cle: string) {
      if (cle in cible) return cible[cle];
      if (cle === 'measureText') return () => ({ width: 10 });
      return (...a: unknown[]) => {
        if (cle === 'drawImage')
          appels.push(
            `image ${String(a[0])} @${a
              .slice(5)
              .map((n) => Math.round(n as number))
              .join(',')} a=${cible.globalAlpha} f=${cible.filter}`,
          );
        if (cle === 'fillText') appels.push(`texte ${String(a[0])}`);
      };
    },
    set(cible, cle: string, v) {
      cible[cle] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as ContexteImage & { filter: string }, appels };
}

const clip = (
  id: string,
  debut: number,
  duree: number,
  source: Clip['source'],
  autres: Partial<Clip> = {},
): Clip => ({ id, debut, duree, source, ...autres });

describe('image d’une frise multipistes', () => {
  it('source d’un clip et temps dans la source (vitesse comprise)', () => {
    const c = clip(
      'a',
      1_000,
      4_000,
      { type: 'media', mediaId: 'm1', debutSource: 500 },
      { vitesse: 2 },
    );
    expect(cleSource(c.source)).toBe('media:m1');
    expect(cleSource({ type: 'prise', fichier: 'ecran', debutSource: 0 })).toBe('prise:ecran');
    expect(cleSource({ type: 'capture', captureId: 'c1', debutSource: 0 })).toBe('capture:c1');
    expect(cleSource({ type: 'carton', texte: 'X' })).toBeNull();
    expect(tempsSource(c, 2_000)).toBe(2_500);
  });

  it('filtres image en CSS (aperçu)', () => {
    expect(filtreCss(undefined)).toBe('none');
    expect(
      filtreCss({
        luminosite: 0.2,
        contraste: 1.5,
        saturation: 0,
        noirEtBlanc: true,
        flou: 3,
        chaleur: 0.5,
      }),
    ).toBe('brightness(1.2) contrast(1.5) saturate(0) grayscale(1) blur(3px) sepia(0.5)');
  });

  it('pistes vidéo de bas en haut, cadre, opacité, filtres ; piste masquée ignorée', () => {
    let f = creerFrise('carre', 'T');
    const v1 = f.pistes.find((p) => p.type === 'video')!.id;
    f = poserClip(
      f,
      v1,
      clip(
        'fond',
        0,
        5_000,
        { type: 'media', mediaId: 'm1', debutSource: 0 },
        { filtres: { contraste: 1.5 } },
      ),
    );
    f = poserClip(
      f,
      v1,
      clip(
        'pip',
        0,
        5_000,
        { type: 'prise', fichier: 'camera', debutSource: 0 },
        { cadre: { x: 0.5, y: 0.5, largeur: 0.5, hauteur: 0.5, opacite: 0.5 } },
      ),
    );
    const t1 = f.pistes.find((p) => p.type === 'texte')!.id;
    f = poserClip(
      f,
      t1,
      clip('e', 0, 2_000, {
        type: 'effet',
        calque: {
          type: 'texte',
          texte: 'Bonjour',
          style: 'titre',
          position: 'haut',
          debut: 0,
          fin: 2_000,
        },
      }),
    );
    expect(clipsActifs(f, 1_000).map((x) => x.clip.id)).toEqual(['e', 'pip', 'fond']);
    expect(clipsActifs(f, 6_000)).toEqual([]);

    const sources = {
      'media:m1': { image: 'M1', largeur: 1080, hauteur: 1080 },
      'prise:camera': { image: 'CAM', largeur: 1080, hauteur: 1080 },
    };
    const { ctx, appels } = faux();
    dessinerFrise(ctx, f, 1_000, sources, [], theme);
    expect(appels.filter((a) => a.startsWith('image'))).toEqual([
      'image M1 @0,0,1080,1080 a=1 f=contrast(1.5)',
      'image CAM @540,540,540,540 a=0.5 f=none',
    ]);
    expect(appels.some((a) => a.startsWith('texte'))).toBe(true);

    // Piste vidéo masquée (muette) : rien n'est dessiné.
    const pipPiste = f.pistes.find((p) => p.clips.some((c) => c.id === 'pip'))!.id;
    const g = faux();
    dessinerFrise(g.ctx, modifierPiste(f, pipPiste, { muet: true }), 1_000, sources, [], theme);
    expect(g.appels.filter((a) => a.includes('CAM'))).toEqual([]);
  });

  it('carton : fond et texte ; source pas encore chargée : rien', () => {
    let f = creerFrise('vertical', 'T');
    const v1 = f.pistes.find((p) => p.type === 'video')!.id;
    f = poserClip(f, v1, clip('k', 0, 3_000, { type: 'carton', texte: 'Gratuit' }));
    f = poserClip(
      f,
      v1,
      clip(
        'm',
        3_000,
        3_000,
        { type: 'media', mediaId: 'zz', debutSource: 0 },
        { fondus: { entree: 1_000, sortie: 0 } },
      ),
    );
    const { ctx, appels } = faux();
    dessinerFrise(ctx, f, 1_000, {}, [], theme);
    expect(appels).toContain('texte Gratuit');
    const g = faux();
    dessinerFrise(g.ctx, f, 3_500, {}, [], theme);
    expect(g.appels.filter((a) => a.startsWith('image'))).toEqual([]);
  });
});

describe('motsFrise', () => {
  it('replace les mots de la voix sur la frise (début de source, vitesse), clips muets ignorés', () => {
    let f = creerFrise('vertical', 'x');
    const voix = (id: string, debut: number, debutSource: number, x: Partial<Clip> = {}): Clip => ({
      id,
      debut,
      duree: 1_000,
      source: { type: 'prise', fichier: 'voix', debutSource },
      ...x,
    });
    f = poserClip(f, 'a1', voix('v1', 0, 2_000));
    f = poserClip(f, 'a1', voix('v2', 3_000, 0, { vitesse: 2 }));
    f = poserClip(f, 'a1', voix('v3', 6_000, 0, { muet: true }));
    f = poserClip(f, 'a1', {
      id: 'k',
      debut: 8_000,
      duree: 1_000,
      source: { type: 'prise', fichier: 'ecran', debutSource: 0 },
    } as Clip);
    const mots = [
      { texte: 'avant', debut: 0, fin: 400 },
      { texte: 'bonjour', debut: 1_900, fin: 2_400 },
      { texte: 'hors', debut: 3_500, fin: 3_800 },
    ];
    expect(motsFrise(f, mots)).toEqual(
      [
        { texte: 'avant', debut: 3_000, fin: 3_200 },
        { texte: 'bonjour', debut: 0, fin: 400 },
      ].sort((a, b) => a.debut - b.debut),
    );
    expect(motsFrise(modifierPiste(f, 'a1', { muet: true }), mots)).toEqual([]);
  });
});

describe('surcouche et carton de la frise', () => {
  it('effets et sous-titres seuls ; carton dessiné plein cadre', () => {
    let f = { ...creerFrise('vertical', 'x'), sousTitres: true };
    f = poserClip(f, 't1', {
      id: 'e1',
      debut: 0,
      duree: 2_000,
      source: {
        type: 'effet',
        calque: {
          type: 'texte',
          texte: 'Effet',
          style: 'titre',
          position: 'haut',
          debut: 0,
          fin: 2_000,
        },
      },
    });
    const { ctx, appels } = faux();
    dessinerSurcoucheFrise(
      ctx,
      f,
      1_000,
      [{ debut: 900, fin: 1_500, mots: [{ texte: 'salut', debut: 900, fin: 1_200 }] }],
      theme,
    );
    expect(appels).toContain('texte Effet');
    expect(appels.some((a) => a.includes('SALUT'))).toBe(true);
    const sansSousTitres = faux();
    dessinerSurcoucheFrise(sansSousTitres.ctx, { ...f, sousTitres: false }, 1_000, [], theme);
    expect(sansSousTitres.appels.some((a) => a.includes('SALUT'))).toBe(false);
    const masque = faux();
    dessinerSurcoucheFrise(masque.ctx, modifierPiste(f, 't1', { muet: true }), 1_000, [], theme);
    expect(masque.appels).not.toContain('texte Effet');
    const carton = faux();
    dessinerCarton(
      carton.ctx,
      'vertical',
      'Bonjour',
      1_500,
      3_000,
      rectangleClip('vertical', {}),
      theme,
    );
    expect(carton.appels).toContain('texte Bonjour');
    expect(
      rectangleClip('carre', { cadre: { x: 0.5, y: 0, largeur: 0.5, hauteur: 1, opacite: 1 } }),
    ).toEqual({
      x: 540,
      y: 0,
      largeur: 540,
      hauteur: 1080,
    });
  });
});
