import { describe, expect, it } from 'vitest';
import {
  creerFrise,
  dessinerFrise,
  ecrireSousTitres,
  effetsDe,
  effetsVideoFfmpeg,
  EFFETS_VIDEO,
  etatTransition,
  filtreCssEffets,
  grapheFrise,
  insererClip,
  lignesFrise,
  modifierLigneSousTitres,
  motsSousTitres,
  mouvementEffets,
  poserClip,
  prolongement,
  sousTitresDeLaVoix,
  transitionEnchainee,
  transitionFfmpeg,
  TRANSITIONS,
  clipsVideoVisibles,
  type Clip,
  type ContexteFrise,
  type Frise,
} from './index';

const media = {
  id: 'm1',
  type: 'image' as const,
  chemin: 'studio/u/medias/m1.png',
  nom: 'm',
  dureeMs: 0,
  taille: 1,
};
const clip = (id: string, debut: number, x: Partial<Clip> = {}): Clip => ({
  id,
  debut,
  duree: 1_000,
  source: { type: 'media', mediaId: 'm1', debutSource: 0 },
  ...x,
});
const base = (): Frise => ({ ...creerFrise('vertical', 'x'), medias: [media] });

describe('transitions', () => {
  it('état de chaque transition au milieu, neutre après', () => {
    const tous = Object.fromEntries(
      TRANSITIONS.map((t) => [t, etatTransition({ type: t, duree: 1_000 }, 500)]),
    );
    expect(tous.fondu!.alpha).toBe(0.5);
    expect(tous.noir!.voile).toEqual({ couleur: 'noir', alpha: 0.5 });
    expect(tous.blanc!.voile).toEqual({ couleur: 'blanc', alpha: 0.5 });
    expect(tous.glisserGauche!.dx).toBe(0.5);
    expect(tous.glisserDroite!.dx).toBe(-0.5);
    expect(tous.glisserHaut!.dy).toBe(0.5);
    expect(tous.glisserBas!.dy).toBe(-0.5);
    expect(tous.zoom!.echelle).toBe(1.125);
    expect(tous.flou!.flou).toBe(10);
    expect(tous.balayage!.revele).toBe(0.5);
    expect(etatTransition({ type: 'fondu', duree: 1_000 }, 1_000).alpha).toBe(1);
    expect(etatTransition(undefined, 0).alpha).toBe(1);
    expect(transitionEnchainee('noir')).toBe(false);
    expect(transitionEnchainee('fondu')).toBe(true);
  });

  it('filtres ffmpeg de chaque transition', () => {
    const o = { debut: 2_000, x: 0, y: 0, largeur: 1080, hauteur: 1920 };
    expect(transitionFfmpeg(undefined, o)).toEqual({ filtres: [], x: '0', y: '0' });
    const r = Object.fromEntries(
      TRANSITIONS.map((t) => [t, transitionFfmpeg({ type: t, duree: 500 }, o)]),
    );
    expect(r.fondu!.filtres).toEqual(['fade=t=in:st=0:d=0.5:alpha=1']);
    expect(r.noir!.filtres[0]).toContain('color=black');
    expect(r.blanc!.filtres[0]).toContain('color=white');
    expect(r.glisserGauche!.x).toBe('0+1080*max(0,1-(t-2)/0.5)');
    expect(r.glisserDroite!.x).toBe('0-1080*max(0,1-(t-2)/0.5)');
    expect(r.glisserHaut!.y).toBe('0+1920*max(0,1-(t-2)/0.5)');
    expect(r.glisserBas!.y).toBe('0-1920*max(0,1-(t-2)/0.5)');
    expect(r.zoom!.filtres[0]).toContain('eval=frame');
    expect(r.zoom!.x).toBe('0+(1080-overlay_w)/2');
    expect(r.flou!.filtres[0]).toBe("gblur=sigma=10:enable='lt(t,0.5)'");
    expect(r.balayage!.filtres[0]).toContain('lt(X,W*T/0.5)');
  });

  it('la séquence d’avant reste visible sous une transition enchaînée', () => {
    let f = base();
    f = poserClip(f, 'v1', clip('a', 0));
    f = poserClip(f, 'v1', clip('b', 1_000, { transition: { type: 'fondu', duree: 400 } }));
    const p = f.pistes.find((x) => x.id === 'v1')!;
    expect(prolongement(p, p.clips[0]!)).toBe(400);
    expect(prolongement(p, p.clips[1]!)).toBe(0);
    expect(clipsVideoVisibles(f, 1_200).map((x) => x.clip.id)).toEqual(['a', 'b']);
    expect(clipsVideoVisibles(f, 1_500).map((x) => x.clip.id)).toEqual(['b']);
    const noir = poserClip(
      base(),
      'v1',
      clip('b', 1_000, { transition: { type: 'noir', duree: 400 } }),
    );
    const pn = noir.pistes.find((x) => x.id === 'v1')!;
    expect(prolongement(pn, clip('a', 0))).toBe(0);
  });
});

describe('effets vidéo', () => {
  it('piste + clip sans doublon, CSS, mouvement, ffmpeg', () => {
    expect(effetsDe({ effets: ['sepia'] }, { effets: ['sepia', 'grain'] })).toEqual([
      'sepia',
      'grain',
    ]);
    expect(effetsDe({}, {})).toEqual([]);
    expect(filtreCssEffets(['sepia', 'vintage', 'negatif'])).toHaveLength(3);
    expect(mouvementEffets([], 100)).toEqual({ dx: 0, dy: 0, echelle: 1 });
    const m = mouvementEffets(['tremblement', 'pulsation'], 150);
    expect(m.dx).not.toBe(0);
    expect(m.echelle).not.toBe(1);
    expect(effetsVideoFfmpeg([...EFFETS_VIDEO])).toHaveLength(8);
    expect(effetsVideoFfmpeg(['miroir'])).toEqual(['hflip']);
  });

  it('aperçu : transitions, effets, décalage des effets et des sous-titres', () => {
    const appels: string[] = [];
    const ctx = new Proxy({ globalAlpha: 1, filter: 'none' } as Record<string, unknown>, {
      get(cible, cle: string) {
        if (cle in cible) return cible[cle];
        if (cle === 'measureText') return () => ({ width: 10 });
        return (...a: unknown[]) => void appels.push(`${cle}:${a.map(String).join(',')}`);
      },
    }) as unknown as ContexteFrise;
    let f: Frise = { ...base(), sousTitres: true, decalageSousTitres: { x: 0, y: -0.1 } };
    f = poserClip(f, 'v1', clip('a', 0, { effets: ['miroir', 'rgb', 'vignette', 'grain'] }));
    f = poserClip(f, 'v1', clip('b', 1_000, { transition: { type: 'balayage', duree: 400 } }));
    f = poserClip(f, 'v1', clip('c', 2_000, { transition: { type: 'noir', duree: 400 } }));
    f = poserClip(f, 'v1', clip('d', 3_000, { transition: { type: 'flou', duree: 400 } }));
    f = poserClip(f, 't1', {
      id: 'e',
      debut: 0,
      duree: 4_000,
      decalage: { x: 0.1, y: 0 },
      source: {
        type: 'effet',
        calque: {
          type: 'texte',
          texte: 'T',
          style: 'titre',
          position: 'haut',
          debut: 0,
          fin: 4_000,
        },
      },
    });
    const sources = { 'media:m1': { image: 'img', largeur: 100, hauteur: 100 } };
    for (const t of [500, 1_100, 2_100, 3_100])
      dessinerFrise(
        ctx,
        f,
        t,
        sources,
        [{ debut: 0, fin: 4_000, mots: [{ texte: 'a', debut: 0, fin: 4_000 }] }],
        {
          accent: '#f00',
          accentTexte: '#fff',
          sombre: '#000',
          clair: '#fff',
          succes: '#0f0',
          police: 'x',
          fond: '#111',
        },
      );
    expect(appels.some((a) => a.startsWith('scale:-1,1'))).toBe(true);
    expect(appels.some((a) => a.startsWith('clip:'))).toBe(true);
    expect(appels.some((a) => a.startsWith('translate:108,0'))).toBe(true);
    expect(appels.some((a) => a.startsWith('translate:0,-192'))).toBe(true);
    expect(appels.filter((a) => a.startsWith('drawImage')).length).toBeGreaterThan(5);
  });

  it('rendu : effets, transition et séquence prolongée dans le graphe', () => {
    let f = base();
    f = poserClip(f, 'v1', clip('a', 0, { effets: ['tremblement', 'pulsation', 'sepia'] }));
    f = poserClip(f, 'v1', clip('b', 1_000, { transition: { type: 'glisserGauche', duree: 400 } }));
    f = {
      ...f,
      pistes: f.pistes.map((p) => (p.id === 'v1' ? { ...p, effets: ['grain' as const] } : p)),
    };
    const g = grapheFrise(
      f,
      {
        a: { index: 2, largeur: 100, hauteur: 100, son: false, fixe: true },
        b: { index: 3, largeur: 100, hauteur: 100, son: false, fixe: true },
      },
      { silence: 1, surcouche: null, musique: null },
    );
    expect(g).toContain('noise=alls=25:allf=t');
    expect(g).toContain('colorchannelmixer=.393');
    expect(g).toContain('tpad=stop_mode=clone:stop_duration=0.4');
    expect(g).toContain("enable='between(t,0,1.4)'");
    expect(g).toContain("overlay=x='0+1080*max(0,1-(t-1)/0.4)':y='0'");
    expect(g).toContain('sin((t-0)*90)');
    expect(g).toContain('(1+0.04*sin(2*PI*t/0.6))');
  });
});

describe('insererClip', () => {
  it('pose au point visé et pousse les suivants ; au milieu d’un clip, juste après', () => {
    let f = base();
    for (const [id, d] of [
      ['a', 0],
      ['b', 1_000],
      ['c', 3_000],
    ] as const)
      f = poserClip(f, 'v1', clip(id, d));
    f = poserClip(f, 'v1', clip('x', 5_000));
    const g = insererClip(f, 'x', 'v1', 1_000);
    const v = (h: Frise) =>
      h.pistes.find((p) => p.id === 'v1')!.clips.map((c) => `${c.id}@${c.debut}`);
    expect(v(g)).toEqual(['a@0', 'x@1000', 'b@2000', 'c@3000']);
    expect(v(insererClip(f, 'x', 'v1', 1_500))).toEqual(['a@0', 'b@1000', 'x@2000', 'c@3000']);
    // Piste d'un autre type ou verrouillée : le clip reste sur la sienne.
    expect(v(insererClip(f, 'x', 'a1', 4_000))).toContain('x@4000');
    const verrou = {
      ...f,
      pistes: f.pistes.map((p) => (p.id === 'v1' ? { ...p, verrou: true } : p)),
    };
    expect(insererClip(verrou, 'x', 'v1', 0)).toBe(verrou);
    expect(insererClip(f, 'inconnu', 'v1', 0)).toBe(f);
  });
});

describe('sous-titres de la frise', () => {
  const voix = (): Frise =>
    poserClip(base(), 'a1', {
      id: 'v',
      debut: 0,
      duree: 4_000,
      source: { type: 'prise', fichier: 'voix', debutSource: 0 },
    });
  const mots = [
    { texte: 'un', debut: 0, fin: 300 },
    { texte: 'deux', debut: 300, fin: 600 },
    { texte: 'trois', debut: 2_000, fin: 2_400 },
  ];
  it('corriger une ligne, écrire tout, revenir à la voix', () => {
    const f = voix();
    expect(motsSousTitres(f, mots)).toHaveLength(3);
    const lignes = lignesFrise(f, mots);
    expect(lignes).toHaveLength(2);
    const g = modifierLigneSousTitres(f, mots, 0, 'Bonjour à tous');
    expect(g.sousTitres).toBe(true);
    expect(lignesFrise(g, mots)[0]!.mots.map((m) => m.texte)).toEqual(['Bonjour', 'à', 'tous']);
    expect(lignesFrise(g, mots)[1]!.mots[0]!.texte).toBe('trois');
    expect(modifierLigneSousTitres(f, mots, 9, 'x')).toBe(f);
    expect(lignesFrise(modifierLigneSousTitres(f, mots, 1, ''), mots)).toHaveLength(1);
    const e = ecrireSousTitres(f, 'Un texte écrit');
    expect(e.motsEdites).toHaveLength(3);
    expect(e.motsEdites!.at(-1)!.fin).toBe(4_000);
    expect(ecrireSousTitres(f, '').sousTitres).toBe(false);
    expect(sousTitresDeLaVoix(e).motsEdites).toBeUndefined();
  });
});

describe('écran pas encore filmé', () => {
  it('l’aperçu montre une carte avec le nom de l’écran au lieu d’un vide', () => {
    const textes: string[] = [];
    const ctx = new Proxy({ globalAlpha: 1, filter: 'none' } as Record<string, unknown>, {
      get(cible, cle: string) {
        if (cle in cible) return cible[cle];
        if (cle === 'measureText') return () => ({ width: 10 });
        return (...a: unknown[]) => {
          if (cle === 'fillText') textes.push(String(a[0]));
        };
      },
    }) as unknown as ContexteFrise;
    let f: Frise = { ...base(), captures: [{ id: 'k1', scene: 'fiche_publique' }] };
    f = poserClip(f, 'v1', {
      id: 'x',
      debut: 0,
      duree: 2_000,
      source: { type: 'capture', captureId: 'k1', debutSource: 0 },
    });
    const theme = {
      accent: '#f00',
      accentTexte: '#fff',
      sombre: '#000',
      clair: '#fff',
      succes: '#0f0',
      police: 'x',
      fond: '#111',
    };
    dessinerFrise(ctx, f, 500, {}, [], theme);
    expect(textes.join(' ')).toContain('robot');
    textes.length = 0;
    dessinerFrise(ctx, { ...f, captures: [] }, 500, {}, [], theme);
    expect(textes.join(' ')).toContain('Écran de Portail Travaux');
  });
});
