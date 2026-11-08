import { describe, expect, it } from 'vitest';
import { friseDepuisPlan, frise as schemaFrise, verifierFrise, type PlanMontage } from './index';

const plan: PlanMontage = {
  format: 'vertical',
  titre: 'Défi 24 h',
  plans: [
    {
      id: 'p1',
      source: { debut: 1_000, fin: 5_000 },
      visuel: 'ecran',
      camera: 'coin',
      calques: [
        {
          type: 'texte',
          texte: 'Pari tenu ?',
          style: 'accroche',
          position: 'haut',
          debut: 0,
          fin: 2_000,
        },
      ],
    },
    {
      id: 'p2',
      source: { debut: 6_000, fin: 9_000 },
      visuel: 'capture',
      captureId: 'c1',
      camera: 'cachee',
      calques: [],
    },
    {
      id: 'p3',
      source: { debut: 9_000, fin: 12_000 },
      visuel: 'carton',
      carton: 'Gratuit',
      camera: 'cachee',
      calques: [],
    },
  ],
  captures: [{ id: 'c1', scene: 'fiche_publique' }],
  artisan: null,
  sousTitres: true,
  musique: true,
};

describe('un montage de Claude devient une frise multipistes', () => {
  it('plans sur « Vidéo 1 », caméra en incrustation au-dessus, voix sur « Audio 1 », effets en haut', () => {
    const f = friseDepuisPlan(plan, { voix: true, dureePriseMs: 20_000 });
    expect(f.miniature).toBeUndefined();
    const m = { texte: 'Zéro commission', accent: 'Zéro', tempsMs: 800 };
    expect(
      friseDepuisPlan({ ...plan, miniature: m }, { voix: true, dureePriseMs: 20_000 }).miniature,
    ).toEqual(m);
    expect(schemaFrise.parse(f)).toEqual(f);
    expect(verifierFrise(f)).toEqual([]);
    expect(f.pistes.map((p) => p.nom)).toEqual(['Effets', 'Vidéo 2', 'Vidéo 1', 'Audio 1']);
    const [effets, camera, video, audio] = f.pistes;
    expect(video!.clips.map((c) => [c.debut, c.duree, c.source.type])).toEqual([
      [0, 4_000, 'prise'],
      [4_000, 3_000, 'capture'],
      [7_000, 3_000, 'carton'],
    ]);
    expect(video!.clips[0]!.source).toEqual({
      type: 'prise',
      fichier: 'ecran',
      debutSource: 1_000,
    });
    // Caméra dans le coin : même passage, cadre réduit en bas à droite.
    expect(camera!.clips).toHaveLength(1);
    expect(camera!.clips[0]).toMatchObject({
      debut: 0,
      duree: 4_000,
      source: { fichier: 'camera', debutSource: 1_000 },
    });
    expect(camera!.clips[0]!.cadre!.x).toBeGreaterThan(0.5);
    expect(camera!.clips[0]!.cadre!.largeur).toBeLessThan(0.5);
    // La voix suit les coupes.
    expect(
      audio!.clips.map((c) => [
        c.debut,
        c.duree,
        'debutSource' in c.source && c.source.debutSource,
      ]),
    ).toEqual([
      [0, 4_000, 1_000],
      [4_000, 3_000, 6_000],
      [7_000, 3_000, 9_000],
    ]);
    // Effet posé dans le temps de la vidéo finale.
    expect(effets!.clips[0]).toMatchObject({ debut: 0, duree: 2_000, source: { type: 'effet' } });
    expect(f).toMatchObject({
      sousTitres: true,
      musique: true,
      dureePriseMs: 20_000,
      captures: plan.captures,
    });
  });

  it('sans voix ni caméra : pas de piste audio remplie, pas de piste caméra', () => {
    const f = friseDepuisPlan(
      {
        ...plan,
        plans: plan.plans.map((x) => ({
          ...x,
          visuel: x.visuel === 'ecran' ? 'carton' : x.visuel,
          carton: x.carton ?? 'Texte',
          camera: 'cachee',
        })),
      },
      { voix: false, dureePriseMs: 20_000 },
    );
    expect(f.pistes.map((p) => p.nom)).toEqual(['Effets', 'Vidéo 1', 'Audio 1']);
    expect(f.pistes.find((p) => p.type === 'audio')!.clips).toEqual([]);
  });
});
