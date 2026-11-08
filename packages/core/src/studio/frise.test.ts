import { describe, expect, it } from 'vitest';
import {
  separerChevauchements,
  captureDeScene,
  ajouterPiste,
  ajouterPoint,
  couperClip,
  creerFrise,
  deplacerClip,
  dupliquerClip,
  dureeFrise,
  frise as schemaFrise,
  gainClip,
  LIMITES_MEDIAS,
  modifierClip,
  modifierPiste,
  opaciteClip,
  poserClip,
  rognerClip,
  supprimerClip,
  supprimerPiste,
  supprimerPoint,
  typePisteDuClip,
  clipParId,
  valeurAutomation,
  verifierFrise,
  type Clip,
  type Frise,
} from './index';

const media = {
  id: 'm1',
  type: 'video' as const,
  chemin: 'studio/u/medias/m1.mp4',
  nom: 'chantier.mp4',
  dureeMs: 10_000,
  taille: 1_000,
};
const clipMedia = (debut: number, duree: number, id = 'k1'): Clip => ({
  id,
  debut,
  duree,
  source: { type: 'media', mediaId: 'm1', debutSource: 0 },
});
const base = (): Frise => {
  const f = creerFrise('vertical', 'Essai');
  return { ...f, medias: [media] };
};
const v1 = (f: Frise) => f.pistes.find((p) => p.type === 'video')!.id;

describe('frise multipistes : création et pistes', () => {
  it('une frise vide a une piste vidéo, une piste audio et une piste d’effets, valide', () => {
    const f = creerFrise('vertical', 'Essai');
    expect(f.pistes.map((p) => [p.type, p.nom])).toEqual([
      ['texte', 'Effets'],
      ['video', 'Vidéo 1'],
      ['audio', 'Audio 1'],
    ]);
    expect(schemaFrise.parse(f)).toEqual(f);
    expect(dureeFrise(f)).toBe(0);
    expect(verifierFrise(f)).toEqual(['La frise est vide : ajoutez au moins un clip.']);
  });

  it('ajouter, régler et supprimer une piste', () => {
    let f = ajouterPiste(base(), 'video');
    const v2 = f.pistes.find((p) => p.nom === 'Vidéo 2')!;
    // Une nouvelle piste vidéo passe au-dessus des autres (devant à l'image).
    expect(f.pistes.findIndex((p) => p.id === v2.id)).toBeLessThan(
      f.pistes.findIndex((p) => p.nom === 'Vidéo 1'),
    );
    f = modifierPiste(f, v2.id, { muet: true, volume: 0.5 });
    expect(f.pistes.find((p) => p.id === v2.id)).toMatchObject({ muet: true, volume: 0.5 });
    f = supprimerPiste(f, v2.id);
    expect(f.pistes.some((p) => p.id === v2.id)).toBe(false);
    // Jamais la dernière piste d'un type.
    expect(supprimerPiste(f, v1(f))).toBe(f);
  });
});

describe('clips', () => {
  it('poser : si la place est prise, le clip va sur une piste libre (créée au besoin)', () => {
    let f = poserClip(base(), v1(base()), clipMedia(0, 4_000, 'a'));
    f = poserClip(f, v1(f), clipMedia(2_000, 4_000, 'b'));
    const pistes = f.pistes.filter((p) => p.type === 'video');
    expect(pistes).toHaveLength(2);
    expect(pistes.flatMap((p) => p.clips.map((c) => c.id)).sort()).toEqual(['a', 'b']);
    expect(dureeFrise(f)).toBe(6_000);
  });

  it('déplacer (dans le temps et d’une piste à l’autre), couper, rogner, dupliquer, supprimer', () => {
    let f = poserClip(base(), v1(base()), clipMedia(0, 6_000, 'a'));
    f = ajouterPiste(f, 'video');
    const v2 = f.pistes.find((p) => p.nom === 'Vidéo 2')!.id;
    f = deplacerClip(f, 'a', v2, 1_000);
    expect(f.pistes.find((p) => p.id === v2)!.clips[0]).toMatchObject({ id: 'a', debut: 1_000 });

    f = couperClip(f, 'a', 3_000);
    const [g, d] = f.pistes.find((p) => p.id === v2)!.clips;
    expect(g).toMatchObject({ debut: 1_000, duree: 2_000 });
    expect(d).toMatchObject({ debut: 3_000, duree: 4_000, source: { debutSource: 2_000 } });
    // Couper hors du clip ou trop près d'un bord : rien.
    expect(couperClip(f, 'a', 1_050)).toBe(f);

    // Rogner le début : la source avance d'autant.
    f = rognerClip(f, d!.id, { debut: 4_000 });
    expect(f.pistes.find((p) => p.id === v2)!.clips[1]).toMatchObject({
      debut: 4_000,
      duree: 3_000,
      source: { debutSource: 3_000 },
    });
    // Jamais au-delà de la fin du média (10 s) : on ne rallonge pas un clip vidéo au-delà.
    f = rognerClip(f, d!.id, { fin: 60_000 });
    expect(f.pistes.find((p) => p.id === v2)!.clips[1]!.duree).toBe(7_000);

    f = dupliquerClip(f, 'a');
    expect(f.pistes.flatMap((p) => p.clips)).toHaveLength(3);
    f = supprimerClip(f, 'a');
    expect(f.pistes.flatMap((p) => p.clips).some((c) => c.id === 'a')).toBe(false);
  });

  it('volume, muet, solo, fondus et automation donnent le gain réel', () => {
    let f = poserClip(base(), v1(base()), clipMedia(0, 4_000, 'a'));
    f = modifierClip(f, 'a', { volume: 0.8, fondus: { entree: 1_000, sortie: 0 } });
    const piste = f.pistes.find((p) => p.id === v1(f))!;
    const clip = piste.clips[0]!;
    expect(gainClip(piste, clip, 500, false)).toBeCloseTo(0.4);
    expect(gainClip(piste, clip, 2_000, false)).toBeCloseTo(0.8);
    expect(gainClip({ ...piste, muet: true }, clip, 2_000, false)).toBe(0);
    // Une autre piste en solo : celle-ci se tait.
    expect(gainClip(piste, clip, 2_000, true)).toBe(0);
    expect(gainClip({ ...piste, solo: true }, clip, 2_000, true)).toBeCloseTo(0.8);

    f = ajouterPoint(f, 'a', 'volume', { t: 2_000, v: 1 });
    f = ajouterPoint(f, 'a', 'volume', { t: 3_000, v: 0 });
    const c2 = f.pistes.find((p) => p.id === v1(f))!.clips[0]!;
    expect(gainClip(piste, c2, 2_500, false)).toBeCloseTo(0.4);
    expect(opaciteClip(c2, 2_500)).toBe(1);
  });

  it('automation : interpolation linéaire, valeur par défaut sans point', () => {
    const pts = [
      { t: 1_000, v: 0 },
      { t: 3_000, v: 1 },
    ];
    expect(valeurAutomation(pts, 0, 0.5)).toBe(0);
    expect(valeurAutomation(pts, 2_000, 0.5)).toBe(0.5);
    expect(valeurAutomation(pts, 9_000, 0.5)).toBe(1);
    expect(valeurAutomation([], 9_000, 0.5)).toBe(0.5);
  });
});

describe('vérifications', () => {
  it('médias manquants, pistes du mauvais type, limites de taille', () => {
    const f = poserClip(base(), v1(base()), clipMedia(0, 4_000, 'a'));
    expect(verifierFrise(f)).toEqual([]);
    expect(verifierFrise({ ...f, medias: [] })).toContain(
      'Un clip utilise un média absent de la bibliothèque.',
    );
    const audio = f.pistes.find((p) => p.type === 'audio')!.id;
    const mal = {
      ...f,
      pistes: f.pistes.map((p) =>
        p.id === audio
          ? {
              ...p,
              clips: [
                { ...clipMedia(0, 1_000, 'z'), source: { type: 'carton' as const, texte: 'X' } },
              ],
            }
          : p,
      ),
    };
    expect(verifierFrise(mal)).toContain('« Audio 1 » ne peut contenir que du son.');
    expect(LIMITES_MEDIAS).toEqual({
      video: 1_073_741_824,
      audio: 209_715_200,
      image: 20_971_520,
      projet: 5_368_709_120,
    });
    const lourd = { ...f, medias: [{ ...media, taille: LIMITES_MEDIAS.projet + 1 }] };
    expect(verifierFrise(lourd)).toContain('Les médias dépassent 5 Go pour ce projet.');
  });
});

describe('garde-fous', () => {
  it('clip inconnu, piste verrouillée, 16 pistes au plus', () => {
    let f = poserClip(base(), v1(base()), clipMedia(0, 4_000, 'a'));
    for (const op of [
      (g: Frise) => supprimerClip(g, 'zz'),
      (g: Frise) => deplacerClip(g, 'zz', v1(g), 0),
      (g: Frise) => modifierClip(g, 'zz', { volume: 0 }),
      (g: Frise) => couperClip(g, 'zz', 1_000),
      (g: Frise) => rognerClip(g, 'zz', { fin: 1 }),
      (g: Frise) => dupliquerClip(g, 'zz'),
      (g: Frise) => ajouterPoint(g, 'zz', 'volume', { t: 0, v: 1 }),
      (g: Frise) => supprimerPoint(g, 'a', 'opacite', 0),
    ])
      expect(op(f)).toBe(f);
    expect(clipParId(f, 'zz')).toBeNull();
    // Piste verrouillée : rien ne bouge, et un nouveau clip va ailleurs.
    const verrou = modifierPiste(f, v1(f), { verrou: true });
    for (const op of [
      (g: Frise) => supprimerClip(g, 'a'),
      (g: Frise) => deplacerClip(g, 'a', v1(g), 500),
      (g: Frise) => modifierClip(g, 'a', { volume: 0 }),
      (g: Frise) => couperClip(g, 'a', 2_000),
      (g: Frise) => rognerClip(g, 'a', { fin: 2_000 }),
    ])
      expect(op(verrou)).toBe(verrou);
    expect(
      poserClip(verrou, v1(verrou), clipMedia(0, 1_000, 'b')).pistes.filter(
        (p) => p.type === 'video',
      ),
    ).toHaveLength(2);
    let g = f;
    for (let i = 0; i < 20; i++) g = ajouterPiste(g, i % 2 ? 'audio' : 'texte');
    expect(g.pistes).toHaveLength(16);
    expect(ajouterPiste(g, 'video')).toBe(g);
    // Plus de place pour une nouvelle piste : le clip n'est pas posé.
    expect(poserClip(g, v1(g), clipMedia(0, 4_000, 'c'))).toBe(g);
    // Supprimer un point d'automation ; types de pistes des sources.
    f = ajouterPoint(f, 'a', 'opacite', { t: 9_999, v: 0.5 });
    expect(clipParId(f, 'a')!.clip.automations!.opacite).toEqual([{ t: 4_000, v: 0.5 }]);
    f = supprimerPoint(f, 'a', 'opacite', 4_000);
    expect(clipParId(f, 'a')!.clip.automations!.opacite).toEqual([]);
    const types = (['carton', 'voix', 'camera', 'effet', 'capture'] as const).map((t) =>
      typePisteDuClip(
        {
          id: 'x',
          debut: 0,
          duree: 100,
          source:
            t === 'carton'
              ? { type: 'carton', texte: 'X' }
              : t === 'effet'
                ? { type: 'effet', calque: { type: 'fleche', x: 0, y: 0, debut: 0, fin: 100 } }
                : t === 'capture'
                  ? { type: 'capture', captureId: 'c1', debutSource: 0 }
                  : { type: 'prise', fichier: t, debutSource: 0 },
        },
        f,
      ),
    );
    expect(types).toEqual(['video', 'audio', 'video', 'texte', 'video']);
  });

  it('couper avec fondus et automations ; rogner une prise, une image, contre un voisin', () => {
    let f = poserClip(base(), v1(base()), clipMedia(0, 4_000, 'a'));
    f = modifierClip(f, 'a', {
      fondus: { entree: 500, sortie: 700 },
      automations: {
        volume: [
          { t: 1_000, v: 1 },
          { t: 3_000, v: 0 },
        ],
        opacite: [{ t: 3_500, v: 1 }],
      },
    });
    f = couperClip(f, 'a', 2_000);
    const [g, d] = f.pistes.find((p) => p.id === v1(f))!.clips;
    expect(g!.fondus).toEqual({ entree: 500, sortie: 0 });
    expect(d!.fondus).toEqual({ entree: 0, sortie: 700 });
    expect(g!.automations).toEqual({ volume: [{ t: 1_000, v: 1 }] });
    expect(d!.automations).toEqual({ volume: [{ t: 1_000, v: 0 }], opacite: [{ t: 1_500, v: 1 }] });
    // Bord gauche : ne recule pas avant le début de la source.
    expect(rognerClip(f, d!.id, { debut: 0 })).toBe(f);
    const seul = rognerClip(supprimerClip(f, g!.id), d!.id, { debut: 0 });
    expect(clipParId(seul, d!.id)!.clip).toMatchObject({
      debut: 0,
      duree: 4_000,
      source: { debutSource: 0 },
    });

    // Prise : limitée par la durée de la prise ; image ou carton : sans limite.
    const prise: Clip = {
      id: 'p',
      debut: 0,
      duree: 1_000,
      source: { type: 'prise', fichier: 'ecran', debutSource: 2_000 },
    };
    let h = poserClip({ ...base(), dureePriseMs: 5_000 }, v1(base()), prise);
    h = rognerClip(h, 'p', { fin: 60_000 });
    expect(clipParId(h, 'p')!.clip.duree).toBe(3_000);
    const carton: Clip = {
      id: 'k',
      debut: 0,
      duree: 1_000,
      source: { type: 'carton', texte: 'X' },
    };
    h = rognerClip(poserClip(base(), v1(base()), carton), 'k', { fin: 60_000 });
    expect(clipParId(h, 'k')!.clip.duree).toBe(60_000);
    // Gain : fondu de sortie.
    const pi = h.pistes.find((p) => p.id === v1(h))!;
    expect(
      gainClip(pi, { ...carton, fondus: { entree: 0, sortie: 1_000 } }, 500, false),
    ).toBeCloseTo(0.5);
    expect(
      valeurAutomation(
        [
          { t: 0, v: 0 },
          { t: 0, v: 1 },
        ],
        0,
        1,
      ),
    ).toBe(0);
  });

  it('vérifications : capture inconnue, chevauchement, durée maximale', () => {
    const cap: Clip = {
      id: 'c',
      debut: 0,
      duree: 1_000,
      source: { type: 'capture', captureId: 'c9', debutSource: 0 },
    };
    const f = poserClip(base(), v1(base()), cap);
    expect(verifierFrise(f)).toEqual(['Un clip utilise une capture inconnue.']);
    const v = f.pistes.find((p) => p.id === v1(f))!;
    const chevauche = {
      ...f,
      captures: [{ id: 'c9', scene: 'devis_creation' as const }],
      pistes: f.pistes.map((p) =>
        p.id === v.id ? { ...p, clips: [cap, { ...cap, id: 'd', debut: 500 }] } : p,
      ),
    };
    expect(verifierFrise(chevauche)).toEqual(['Deux clips se chevauchent sur « Vidéo 1 ».']);
    const long = {
      ...chevauche,
      pistes: chevauche.pistes.map((p) =>
        p.id === v.id ? { ...p, clips: [{ ...cap, duree: 200_000 }] } : p,
      ),
    };
    expect(verifierFrise(long)).toEqual(['La vidéo dépasse 3 minutes.']);
  });
});

describe('captureDeScene', () => {
  it('réutilise la capture de la scène, en ajoute une sinon, 12 au plus', () => {
    const f = creerFrise('vertical', 'x');
    const a = captureDeScene(f, 'fiche_publique')!;
    expect(a.captureId).toBe('c1');
    expect(a.frise.captures).toEqual([{ id: 'c1', scene: 'fiche_publique' }]);
    expect(captureDeScene(a.frise, 'fiche_publique')).toEqual({ frise: a.frise, captureId: 'c1' });
    expect(captureDeScene(a.frise, 'demandes_recues')!.captureId).toBe('c2');
    const plein = {
      ...f,
      captures: Array.from({ length: 12 }, (_, i) => ({
        id: `c${i + 1}`,
        scene: 'fiche_publique' as const,
      })),
    };
    expect(captureDeScene(plein, 'demandes_recues')).toBeNull();
  });
});

describe('separerChevauchements', () => {
  it('un clip qui en recouvre un autre passe sur une piste du même type en dessous', () => {
    const f = creerFrise('vertical', 'x');
    const effet = (id: string, debut: number) => ({
      id,
      debut,
      duree: 1_000,
      source: {
        type: 'effet' as const,
        calque: {
          type: 'texte' as const,
          texte: 'T',
          style: 'titre' as const,
          position: 'haut' as const,
          debut: 0,
          fin: 1_000,
        },
      },
    });
    const g = {
      ...f,
      pistes: f.pistes.map((p) =>
        p.id === 't1' ? { ...p, clips: [effet('a', 0), effet('b', 500), effet('c', 1_000)] } : p,
      ),
    };
    const r = separerChevauchements(g);
    expect(r.pistes.map((p) => p.nom)).toEqual(['Effets', 'Effets bis', 'Vidéo 1', 'Audio 1']);
    expect(r.pistes[0]!.clips.map((c) => c.id)).toEqual(['a', 'c']);
    expect(r.pistes[1]!.clips.map((c) => c.id)).toEqual(['b']);
    expect(verifierFrise(r)).toEqual([]);
    expect(separerChevauchements(f)).toBe(f);
  });
});
