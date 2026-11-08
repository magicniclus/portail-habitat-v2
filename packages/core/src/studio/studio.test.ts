import { describe, expect, it } from 'vitest';
import {
  DUREE_MAX_MS,
  DUREE_MIN_MS,
  avecCamera,
  couverture,
  disposition,
  dureePlan,
  FORMAT_DEFAUT,
  FORMATS_STUDIO,
  lignesSousTitres,
  motsSortie,
  planMontage,
  positionSource,
  segmentsParoles,
  srt,
  verifierPlan,
  type MotTranscrit,
  type PlanMontage,
} from './index';

const mot = (texte: string, debut: number, fin: number): MotTranscrit => ({ texte, debut, fin });

const base = (surcharge: Partial<PlanMontage> = {}): PlanMontage => ({
  format: 'vertical',
  titre: 'Test',
  plans: [
    { id: 'p1', source: { debut: 0, fin: 6_000 }, visuel: 'ecran', camera: 'bas', calques: [] },
    {
      id: 'p2',
      source: { debut: 8_000, fin: 14_000 },
      visuel: 'capture',
      captureId: 'c1',
      camera: 'cachee',
      calques: [
        {
          type: 'texte',
          texte: '10 demandes',
          style: 'chiffre',
          position: 'haut',
          debut: 0,
          fin: 2_000,
        },
      ],
    },
  ],
  captures: [{ id: 'c1', scene: 'demandes_recues' }],
  artisan: null,
  sousTitres: true,
  musique: false,
  ...surcharge,
});

describe('formats', () => {
  it('vertical par défaut, trois formats paramétrables', () => {
    expect(FORMAT_DEFAUT).toBe('vertical');
    expect(FORMATS_STUDIO.vertical).toMatchObject({ largeur: 1080, hauteur: 1920 });
    expect(FORMATS_STUDIO.horizontal).toMatchObject({ largeur: 1920, hauteur: 1080 });
    expect(FORMATS_STUDIO.carre).toMatchObject({ largeur: 1080, hauteur: 1080 });
  });
});

describe('plan de montage', () => {
  it('durée = somme des segments gardés', () => {
    expect(dureePlan(base())).toBe(12_000);
  });

  it('position dans la source pour un instant de la vidéo finale', () => {
    const p = base();
    expect(positionSource(p, 0)).toEqual({ index: 0, tPlan: 0, tSource: 0 });
    expect(positionSource(p, 5_999)).toEqual({ index: 0, tPlan: 5_999, tSource: 5_999 });
    expect(positionSource(p, 6_000)).toEqual({ index: 1, tPlan: 0, tSource: 8_000 });
    expect(positionSource(p, 11_500)).toEqual({ index: 1, tPlan: 5_500, tSource: 13_500 });
    // Au-delà de la fin : dernière image.
    expect(positionSource(p, 99_000)).toEqual({ index: 1, tPlan: 6_000, tSource: 14_000 });
  });

  it('schéma strict : un visuel inconnu est refusé', () => {
    const p = base() as unknown as { plans: { visuel: string }[] };
    p.plans[0]!.visuel = 'video_youtube';
    expect(planMontage.safeParse(p).success).toBe(false);
  });

  it('accepte un plan correct', () => {
    expect(verifierPlan(base(), { dureePriseMs: 20_000, camera: true })).toEqual([]);
  });

  it('session tournée d’une traite : seuls les passages de la vidéo sont permis', () => {
    // base() : plans de 0 à 6 s et de 8 à 14 s.
    expect(
      verifierPlan(base(), {
        dureePriseMs: 20_000,
        camera: true,
        plage: { debut: 0, fin: 14_000 },
      }),
    ).toEqual([]);
    expect(
      verifierPlan(base(), {
        dureePriseMs: 20_000,
        camera: true,
        plage: { debut: 1_000, fin: 20_000 },
      }).join(' | '),
    ).toMatch(/hors du passage de cette vidéo/);
  });

  it('durée entre 10 s et 3 min', () => {
    expect(DUREE_MIN_MS).toBe(10_000);
    expect(DUREE_MAX_MS).toBe(180_000);
    const court = base({
      plans: [
        {
          id: 'p1',
          source: { debut: 0, fin: 5_000 },
          visuel: 'ecran',
          camera: 'cachee',
          calques: [],
        },
      ],
    });
    expect(verifierPlan(court, { dureePriseMs: 20_000, camera: true })[0]).toMatch(/10 s/);
  });

  it('segments dans la prise, capture connue, caméra disponible', () => {
    const erreurs = verifierPlan(
      base({
        plans: [
          {
            id: 'p1',
            source: { debut: 0, fin: 25_000 },
            visuel: 'camera',
            camera: 'cachee',
            calques: [],
          },
          {
            id: 'p2',
            source: { debut: 3_000, fin: 2_000 },
            visuel: 'capture',
            captureId: 'inconnue',
            camera: 'bas',
            calques: [],
          },
        ],
      }),
      { dureePriseMs: 20_000, camera: false },
    );
    expect(erreurs.join(' | ')).toMatch(/dépasse la fin de la prise/);
    expect(erreurs.join(' | ')).toMatch(/fin avant son début/);
    expect(erreurs.join(' | ')).toMatch(/capture « inconnue »/);
    expect(erreurs.join(' | ')).toMatch(/sans caméra/);
  });

  it('écrans de Portail Travaux : 3 au plus, et 4 s d’affilée au moins', () => {
    const capture = (id: string, captureId: string, debut: number, fin: number) => ({
      id,
      source: { debut, fin },
      visuel: 'capture' as const,
      captureId,
      camera: 'cachee' as const,
      calques: [],
    });
    const captures = ['c1', 'c2', 'c3', 'c4'].map((id) => ({
      id,
      scene: 'demandes_recues' as const,
    }));
    const quatre = base({
      captures,
      plans: ['c1', 'c2', 'c3', 'c4'].map((c, i) =>
        capture(`p${i}`, c, i * 5_000, i * 5_000 + 5_000),
      ),
    });
    expect(verifierPlan(quatre, { dureePriseMs: 20_000, camera: true })).toEqual([
      expect.stringMatching(/4 écrans de Portail Travaux : montre-en 3 au plus/),
    ]);
    // Deux plans d'affilée sur le même écran comptent ensemble ; un écran seul 2 s : refusé.
    const court = base({
      captures,
      plans: [
        capture('a', 'c1', 0, 2_500),
        capture('b', 'c1', 2_500, 5_000),
        capture('c', 'c2', 5_000, 7_000),
        capture('d', 'c3', 7_000, 12_000),
      ],
    });
    expect(verifierPlan(court, { dureePriseMs: 20_000, camera: true })).toEqual([
      expect.stringMatching(/Plan « c » : l’écran « c2 » ne reste que 2 s/),
    ]);
  });

  it('un calque doit rester dans son plan', () => {
    const p = base();
    p.plans[0]!.calques.push({
      type: 'compteur',
      de: 0,
      a: 10,
      libelle: 'demandes par mois',
      position: 'centre',
      debut: 5_000,
      fin: 9_000,
    });
    expect(verifierPlan(p, { dureePriseMs: 20_000, camera: true })[0]).toMatch(/calque/);
  });

  it('argent en centimes entiers pour l’artisan fictif', () => {
    const p = base({
      artisan: {
        nom: 'Martin Rénovation',
        metier: 'plombier',
        ville: 'Bordeaux',
        demandesParMois: 10,
        chiffreAffairesCentimes: 1_250_000.5,
      },
    });
    expect(planMontage.safeParse(p).success).toBe(false);
  });
});

describe('disposition', () => {
  it('vertical : écran en haut, caméra en bas sur un tiers', () => {
    const d = disposition('vertical', 'ecran', 'bas');
    expect(d.camera).toEqual({ x: 0, y: 1280, largeur: 1080, hauteur: 640 });
    expect(d.principal).toEqual({ x: 0, y: 0, largeur: 1080, hauteur: 1280 });
  });

  it('caméra cachée : le visuel prend tout', () => {
    const d = disposition('vertical', 'capture', 'cachee');
    expect(d.camera).toBeNull();
    expect(d.principal).toEqual({ x: 0, y: 0, largeur: 1080, hauteur: 1920 });
  });

  it('caméra en plein écran', () => {
    const d = disposition('horizontal', 'camera', 'cachee');
    expect(d.principal).toBeNull();
    expect(d.camera).toEqual({ x: 0, y: 0, largeur: 1920, hauteur: 1080 });
  });

  it('caméra en vignette dans le coin', () => {
    const d = disposition('horizontal', 'ecran', 'coin');
    expect(d.principal).toEqual({ x: 0, y: 0, largeur: 1920, hauteur: 1080 });
    expect(d.camera!.largeur).toBeLessThan(600);
    expect(d.camera!.x + d.camera!.largeur).toBeLessThanOrEqual(1920);
  });
});

describe('découpe automatique', () => {
  it('retire les silences longs et les « euh », garde une marge', () => {
    const mots = [
      mot('Artisans', 500, 900),
      mot('euh', 1_000, 1_300),
      mot('recevez', 1_400, 1_800),
      mot('des', 1_850, 2_000),
      mot('demandes', 4_000, 4_500),
    ];
    expect(segmentsParoles(mots, { silenceMaxMs: 700, margeMs: 150 })).toEqual([
      { debut: 350, fin: 950 },
      { debut: 1_350, fin: 2_150 },
      { debut: 3_850, fin: 4_650 },
    ]);
  });

  it('aucun mot : aucun segment', () => {
    expect(segmentsParoles([], {})).toEqual([]);
  });
});

describe('sous-titres', () => {
  const p = base();
  const mots = [
    mot('Recevez', 100, 500),
    mot('des', 550, 700),
    mot('demandes', 750, 1_200),
    mot('coupé', 7_000, 7_500), // hors segment : disparaît
    mot('gratuitement', 8_200, 9_000),
  ];

  it('les mots suivent la vidéo finale (les coupes sont retirées)', () => {
    expect(motsSortie(p, mots)).toEqual([
      mot('Recevez', 100, 500),
      mot('des', 550, 700),
      mot('demandes', 750, 1_200),
      mot('gratuitement', 6_200, 7_000),
    ]);
  });

  it('lignes courtes pour le format vertical', () => {
    const lignes = lignesSousTitres(motsSortie(p, mots), { motsMax: 3, caracteresMax: 24 });
    expect(lignes.map((l) => l.mots.map((m) => m.texte).join(' '))).toEqual([
      'Recevez des demandes',
      'gratuitement',
    ]);
  });

  it('export SRT', () => {
    const lignes = lignesSousTitres(motsSortie(p, mots), { motsMax: 3, caracteresMax: 24 });
    expect(srt(lignes)).toBe(
      '1\n00:00:00,100 --> 00:00:01,200\nRecevez des demandes\n\n2\n00:00:06,200 --> 00:00:07,000\ngratuitement\n',
    );
  });
});

describe('recadrage', () => {
  it('écran 16:9 dans une vidéo verticale : bande centrale', () => {
    expect(couverture({ largeur: 1920, hauteur: 1080 }, { largeur: 1080, hauteur: 1280 })).toEqual({
      x: 504,
      y: 0,
      largeur: 911,
      hauteur: 1080,
    });
  });
  it('même rapport : toute la source', () => {
    expect(couverture({ largeur: 1920, hauteur: 1080 }, { largeur: 1920, hauteur: 1080 })).toEqual({
      x: 0,
      y: 0,
      largeur: 1920,
      hauteur: 1080,
    });
  });
  it('zoom sur une zone de l’écran', () => {
    const r = couverture(
      { largeur: 1920, hauteur: 1080 },
      { largeur: 1080, hauteur: 1280 },
      { x: 0.5, y: 0.2, largeur: 0.25 },
    );
    expect(r.x).toBeGreaterThanOrEqual(960);
    expect(r.y).toBe(216);
    expect(r.largeur / r.hauteur).toBeCloseTo(1080 / 1280, 1);
  });
});

describe('afficher ou masquer la caméra', () => {
  it('masquée : plus aucune caméra, l’écran remplace la face caméra', () => {
    const p = avecCamera(base(), false, { ecran: true });
    expect(p.plans.map((x) => [x.visuel, x.camera])).toEqual([
      ['ecran', 'cachee'],
      ['capture', 'cachee'],
    ]);
    expect(verifierPlan(p, { dureePriseMs: 20_000, camera: false })).toEqual([]);
  });
  it('sans écran : un carton', () => {
    const p = avecCamera(
      base({
        plans: [
          {
            id: 'p1',
            source: { debut: 0, fin: 12_000 },
            visuel: 'camera',
            camera: 'cachee',
            calques: [],
          },
        ],
      }),
      false,
      { ecran: false },
    );
    expect(p.plans[0]).toMatchObject({ visuel: 'carton', carton: 'Test' });
  });
  it('affichée : en bas des plans qui n’en avaient pas', () => {
    const p = avecCamera(base(), true, { ecran: true });
    expect(p.plans.map((x) => x.camera)).toEqual(['bas', 'bas']);
  });
});

describe('miniature du plan', () => {
  it('doit tomber dans la vidéo', () => {
    expect(
      verifierPlan(base({ miniature: { texte: 'x', accent: '', tempsMs: 1_000 } }), {
        dureePriseMs: 20_000,
        camera: true,
      }),
    ).toEqual([]);
    expect(
      verifierPlan(base({ miniature: { texte: 'x', accent: '', tempsMs: 60_000 } }), {
        dureePriseMs: 20_000,
        camera: true,
      })[0],
    ).toMatch(/Miniature/);
  });
});

describe('voix seule', () => {
  it('sans écran enregistré, pas de visuel « écran »', () => {
    const e = verifierPlan(base(), { dureePriseMs: 20_000, camera: true, ecran: false });
    expect(e.join(' ')).toMatch(/aucun écran enregistré/);
    const sansEcran = base({
      plans: base().plans.map((x) =>
        x.visuel === 'ecran'
          ? { ...x, visuel: 'carton' as const, carton: 'Stop', camera: 'cachee' as const }
          : x,
      ),
    });
    expect(verifierPlan(sansEcran, { dureePriseMs: 20_000, camera: false, ecran: false })).toEqual(
      [],
    );
  });
});
