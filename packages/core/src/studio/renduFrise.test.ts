import { describe, expect, it } from 'vitest';
import { creerFrise, type Clip, type Frise } from './frise';
import { poserClip } from './operationsFrise';
import {
  atempo,
  clipAudible,
  expressionGain,
  expressionPoints,
  fichierDuClip,
  filtresImageFfmpeg,
  filtresSonFfmpeg,
  grapheFrise,
} from './renduFrise';

const media = (id: string, type: 'video' | 'audio' | 'image') => ({
  id,
  type,
  chemin: `studio/u/medias/${id}.${type === 'image' ? 'png' : type === 'audio' ? 'mp3' : 'mp4'}`,
  nom: id,
  dureeMs: type === 'image' ? 0 : 10_000,
  taille: 10,
});
const clip = (id: string, mediaId: string, champs: Partial<Clip> = {}): Clip => ({
  id,
  debut: 1_000,
  duree: 2_000,
  source: { type: 'media', mediaId, debutSource: 0 },
  ...champs,
});

function frise(): Frise {
  let f: Frise = {
    ...creerFrise('vertical', 'Essai'),
    medias: [media('m1', 'video'), media('m2', 'audio'), media('m3', 'image')],
  };
  f = poserClip(f, 'v1', clip('c1', 'm1', { vitesse: 2, filtres: { noirEtBlanc: true } }));
  f = poserClip(f, 'a1', clip('c2', 'm2', { debut: 0, son: { graves: 3 } }));
  f = poserClip(
    f,
    'v1',
    clip('c3', 'm3', {
      debut: 3_500,
      cadre: { x: 0.5, y: 0.5, largeur: 0.5, hauteur: 0.25, opacite: 0.5 },
      fondus: { entree: 500, sortie: 500 },
      automations: {
        opacite: [
          { t: 0, v: 1 },
          { t: 1_000, v: 0 },
        ],
      },
    }),
  );
  return f;
}

describe('expressionPoints', () => {
  it('valeur par défaut sans point, constante avant / après, linéaire entre deux points', () => {
    expect(expressionPoints(undefined, 1)).toBe('1');
    expect(expressionPoints([{ t: 500, v: 0.5 }], 1)).toBe('if(lt(t,0.5),0.5,0.5)');
    const e = expressionPoints(
      [
        { t: 0, v: 1 },
        { t: 1_000, v: 0 },
        { t: 1_000, v: 2 },
      ],
      1,
      'T',
    );
    expect(e).toBe('if(lt(T,0),1,if(lt(T,1),1+-1*(T-0)/1,if(lt(T,1),2,2)))');
  });
});

describe('son', () => {
  it('atempo découpé entre 0,5 et 2', () => {
    expect(atempo(1)).toEqual([]);
    expect(atempo(4)).toEqual(['atempo=2', 'atempo=2']);
    expect(atempo(0.25)).toEqual(['atempo=0.5', 'atempo=0.5']);
    expect(atempo(1.5)).toEqual(['atempo=1.5']);
  });
  it('filtres son', () => {
    expect(filtresSonFfmpeg(undefined)).toEqual([]);
    expect(filtresSonFfmpeg({ graves: 3, mediums: -2, aigus: 4, voixClaire: true })).toEqual([
      'highpass=f=90',
      'bass=g=3',
      'equalizer=f=1000:t=o:w=1:g=-2',
      'treble=g=4',
      'equalizer=f=3000:t=o:w=1:g=4',
    ]);
    expect(filtresSonFfmpeg({ reductionBruit: true })).toEqual([
      'highpass=f=120',
      'afftdn=nf=-25',
      'lowpass=f=9000',
    ]);
  });
  it('gain : piste × clip, automation, fondus ; muet et solo', () => {
    const f = frise();
    const p = { ...f.pistes[2]!, volume: 0.5 };
    const c = clip('x', 'm2', {
      volume: 2,
      fondus: { entree: 1_000, sortie: 500 },
      automations: { volume: [{ t: 0, v: 0.5 }] },
    });
    expect(expressionGain(p, c)).toBe('1*(if(lt(t,0),0.5,0.5))*min(1,t/1)*min(1,max(0,(2-t)/0.5))');
    expect(clipAudible(p, c, false)).toBe(true);
    expect(clipAudible(p, c, true)).toBe(false);
    expect(clipAudible({ ...p, solo: true }, c, true)).toBe(true);
    expect(clipAudible({ ...p, muet: true }, c, false)).toBe(false);
    expect(clipAudible(p, { ...c, muet: true }, false)).toBe(false);
    expect(clipAudible(p, { ...c, volume: 0 }, false)).toBe(false);
  });
});

describe('image', () => {
  it('filtres image', () => {
    expect(filtresImageFfmpeg(undefined)).toEqual([]);
    expect(filtresImageFfmpeg({ contraste: 1, saturation: 1 })).toEqual([]);
    expect(
      filtresImageFfmpeg({
        luminosite: 0.2,
        contraste: 1.2,
        saturation: 1.5,
        chaleur: 0.5,
        flou: 4,
      }),
    ).toEqual([
      'eq=brightness=0.1:contrast=1.2:saturation=1.5',
      'colorbalance=rm=0.15:bm=-0.15',
      'gblur=sigma=2',
    ]);
    expect(filtresImageFfmpeg({ noirEtBlanc: true, saturation: 2 })).toEqual(['eq=saturation=0']);
  });
});

describe('grapheFrise', () => {
  const entrees = {
    c1: { index: 2, largeur: 1920, hauteur: 1080, son: true, fixe: false },
    c2: { index: 3, largeur: 0, hauteur: 0, son: true, fixe: false },
    c3: { index: 4, largeur: 800, hauteur: 800, son: false, fixe: true },
  };
  it('pose les clips vidéo à leur place et mélange les sons', () => {
    const g = grapheFrise(frise(), entrees, { silence: 1, surcouche: 5, musique: null });
    expect(g).toContain('[2:v]setpts=(PTS-STARTPTS)/2,fps=30,crop=');
    expect(g).toContain('eq=saturation=0');
    expect(g).toContain("overlay=0:0:eof_action=pass:enable='between(t,1,3)'[o1]");
    expect(g).toContain('[4:v]setpts=PTS-STARTPTS,fps=30');
    expect(g).toContain('scale=540:480');
    expect(g).toContain('colorchannelmixer=aa=0.5');
    expect(g).toContain('fade=t=out:st=1.5:d=0.5:alpha=1');
    expect(g).toContain("a='alpha(X,Y)*(if(lt(T,0),1,if(lt(T,1),1+-1*(T-0)/1,0)))'");
    expect(g).toContain("[o1][c2]overlay=540:960:eof_action=pass:enable='between(t,3.5,5.5)'[o2]");
    expect(g).toContain('[o2][5:v]overlay=0:0:format=auto,format=yuv420p[v]');
    expect(g).toContain('[1:a]atrim=0:5.5[s0]');
    expect(g).toContain('[3:a]asetpts=PTS-STARTPTS,aresample=48000');
    expect(g).toContain('bass=g=3');
    expect(g).toContain('adelay=0|0[s2]');
    expect(g).toContain('[2:a]asetpts=PTS-STARTPTS,atempo=2');
    expect(g).toContain('adelay=1000|1000[s1]');
    expect(g).toContain('[s0][s1][s2]amix=inputs=3:duration=first:normalize=0');
    expect(g.endsWith('atrim=0:5.5[a]')).toBe(true);
  });
  it('sans surcouche, musique ajoutée ; pistes masquées et clips sans entrée ignorés', () => {
    let f = frise();
    f = { ...f, pistes: f.pistes.map((p) => (p.type === 'audio' ? { ...p, muet: true } : p)) };
    const g = grapheFrise(f, { c1: entrees.c1 }, { silence: 1, surcouche: null, musique: 6 });
    expect(g).toContain('[o1]format=yuv420p[v]');
    expect(g).not.toContain('[3:a]');
    expect(g).toContain('[6:a]volume=0.5,atrim=0:5.5[s2]');
    const cache = {
      ...f,
      pistes: f.pistes.map((p) => (p.type === 'video' ? { ...p, muet: true } : p)),
    };
    expect(grapheFrise(cache, entrees, { silence: 1, surcouche: null, musique: null })).toContain(
      '[0:v]format=yuv420p[v]',
    );
  });
});

describe('fichierDuClip', () => {
  it('média, prise, capture filmée ; rien pour un carton ou un absent', () => {
    const f = {
      ...frise(),
      captures: [{ id: 'k1', scene: 'fiche_publique' as const }],
    };
    const fichiers = {
      prise: { voix: 'p/voix.webm', ecran: 'p/ecran.webm' },
      captures: { 'k1:fiche_publique': 'r/k1.mp4' },
    };
    const c = (source: Clip['source']) => ({ id: 'x', debut: 0, duree: 100, source });
    expect(fichierDuClip(f, c({ type: 'media', mediaId: 'm3', debutSource: 0 }), fichiers)).toEqual(
      { chemin: 'studio/u/medias/m3.png', type: 'image' },
    );
    expect(fichierDuClip(f, c({ type: 'media', mediaId: 'zz', debutSource: 0 }), fichiers)).toBe(
      null,
    );
    expect(
      fichierDuClip(f, c({ type: 'prise', fichier: 'voix', debutSource: 0 }), fichiers),
    ).toEqual({ chemin: 'p/voix.webm', type: 'audio' });
    expect(
      fichierDuClip(f, c({ type: 'prise', fichier: 'ecran', debutSource: 0 }), fichiers),
    ).toEqual({ chemin: 'p/ecran.webm', type: 'video' });
    expect(
      fichierDuClip(f, c({ type: 'prise', fichier: 'camera', debutSource: 0 }), fichiers),
    ).toBe(null);
    expect(
      fichierDuClip(f, c({ type: 'capture', captureId: 'k1', debutSource: 0 }), fichiers),
    ).toEqual({ chemin: 'r/k1.mp4', type: 'video' });
    expect(
      fichierDuClip(f, c({ type: 'capture', captureId: 'k9', debutSource: 0 }), fichiers),
    ).toBe(null);
    expect(fichierDuClip(f, c({ type: 'carton', texte: 'A' }), fichiers)).toBe(null);
  });
});
