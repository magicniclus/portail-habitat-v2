import { describe, expect, it } from 'vitest';
import {
  classerTendances,
  dureeIso,
  promptMontage,
  promptSujets,
  SCHEMA_JSON_PLAN,
  SCHEMA_JSON_SUJETS,
  sortieSujets,
} from './index';

describe('tendances YouTube', () => {
  it('lit les durées ISO 8601', () => {
    expect(dureeIso('PT45S')).toBe(45);
    expect(dureeIso('PT1M5S')).toBe(65);
    expect(dureeIso('PT1H')).toBe(3600);
    expect(dureeIso('n’importe quoi')).toBeNull();
  });

  it('garde les vidéos courtes, classées par vues par jour', () => {
    const maintenant = Date.parse('2026-11-05T00:00:00Z');
    const v = (titre: string, vues: number, publieeLe: string, dureeS: number) => ({
      titre,
      chaine: 'c',
      vues,
      likes: null,
      commentaires: null,
      dureeS,
      publieeLe,
      description: '',
      abonnes: null,
    });
    const r = classerTendances(
      [
        v('ancienne', 1_000_000, '2025-11-05T00:00:00Z', 30),
        v('récente', 100_000, '2026-11-04T00:00:00Z', 40),
        v('longue', 9_000_000, '2026-11-04T00:00:00Z', 600),
      ],
      maintenant,
    );
    expect(r.map((x) => x.titre)).toEqual(['récente', 'ancienne']);
    expect(r[0]!.vuesParJour).toBe(100_000);
  });
});

describe('consignes Claude', () => {
  it('sujets : données YouTube, thème et règles produit', () => {
    const p = promptSujets({
      videos: [
        {
          titre: 'Comment j’ai trouvé 10 clients',
          chaine: 'X',
          vues: 50_000,
          likes: 3_000,
          commentaires: 20,
          dureeS: 35,
          publieeLe: '2026-11-01',
          description: '',
          abonnes: 5_000,
          vuesParJour: 12_000,
          engagement: 0.06,
          multiplicateur: 10,
          scoreViral: 88,
        },
      ],
      theme: 'les demandes gratuites',
      nombre: 3,
    });
    expect(p.demande).toMatch(/Comment j’ai trouvé 10 clients/);
    expect(p.demande).toMatch(/les demandes gratuites/);
    expect(p.demande).toMatch(/Propose 3 sujets/);
    expect(p.systeme).toMatch(/Jamais le mot « lead »/);
    expect(p.contexte).toMatch(/jusqu’à 10 par mois/);
  });

  it('montage : erreurs à corriger et retouche', () => {
    const p = promptMontage({
      format: 'vertical',
      camera: false,
      dureePriseMs: 30_000,
      transcription: '[0-900] Bonjour.',
      segments: [{ debut: 0, fin: 900 }],
      sujet: null,
      erreurs: ['La vidéo dure 0.9 s'],
      retouche: {
        plan: {
          format: 'vertical',
          titre: 't',
          plans: [],
          captures: [],
          artisan: null,
          sousTitres: true,
          musique: false,
        },
        demande: 'coupe la fin',
      },
    });
    expect(p.demande).toMatch(/coupe la fin/);
    expect(p.demande).toMatch(/La vidéo dure 0.9 s/);
    expect(p.demande).toMatch(/cachee/);
  });

  it('la sortie des sujets est validée strictement', () => {
    const sujet = {
      titre: 't',
      angle: 'a',
      pourquoi: 'p',
      accroches: ['h'],
      dureeCibleS: 30,
      script: [
        { voix: 'v1', aEcran: 'camera', texteEcran: '' },
        { voix: 'v2', aEcran: 'fiche_publique', texteEcran: 'Gratuit' },
      ],
      legende: 'l',
      hashtags: ['#artisan'],
      potentielViral: 8,
      vuesVisees: { min: 5_000, max: 50_000 },
      abonnesVises: 300,
      inspirations: ['Comment j’ai trouvé 10 clients'],
      miniature: { texte: '10 clients gratuits', accent: 'gratuits' },
    };
    expect(sortieSujets.safeParse({ sujets: [sujet] }).success).toBe(true);
    expect(sortieSujets.safeParse({ sujets: [{ ...sujet, html: '<b>' }] }).success).toBe(false);
  });

  it('schémas JSON : objets fermés', () => {
    expect(SCHEMA_JSON_SUJETS).toMatchObject({ additionalProperties: false, required: ['sujets'] });
    expect((SCHEMA_JSON_PLAN as { required: string[] }).required).toEqual([
      'format',
      'titre',
      'plans',
      'captures',
      'artisan',
      'sousTitres',
      'musique',
      'miniature',
      'variantes',
    ]);
  });
});

describe('potentiel viral', () => {
  const base = {
    chaine: 'c',
    likes: 100,
    commentaires: 0,
    dureeS: 30,
    publieeLe: '2026-11-04T00:00:00Z',
    description: '',
  };
  const maintenant = Date.parse('2026-11-05T00:00:00Z');

  it('score : élan, engagement et dépassement de l’audience', async () => {
    const { scoreViral } = await import('./tendances');
    expect(scoreViral({ vuesParJour: 0, engagement: null, multiplicateur: null })).toBe(0);
    expect(scoreViral({ vuesParJour: 999, engagement: null, multiplicateur: null })).toBe(45);
    expect(scoreViral({ vuesParJour: 999, engagement: 0.05, multiplicateur: 1 })).toBe(60);
    expect(scoreViral({ vuesParJour: 1e9, engagement: 1, multiplicateur: 1e6 })).toBe(100);
  });

  it('une petite chaîne qui perce passe devant une grosse chaîne', () => {
    const r = classerTendances(
      [
        { ...base, titre: 'grosse chaîne', vues: 20_000, abonnes: 1_000_000 },
        { ...base, titre: 'petite chaîne qui perce', vues: 10_000, abonnes: 800 },
      ],
      maintenant,
    );
    expect(r.map((x) => x.titre)).toEqual(['petite chaîne qui perce', 'grosse chaîne']);
    expect(r[0]!.multiplicateur).toBe(12.5);
    expect(r[0]!.engagement).toBeCloseTo(0.01);
  });

  it('sans compteurs publics : pas d’engagement, pas de multiplicateur', () => {
    const [v] = classerTendances(
      [{ ...base, titre: 't', vues: 0, likes: null, commentaires: null, abonnes: null }],
      maintenant,
    );
    expect(v).toMatchObject({ engagement: null, multiplicateur: null, scoreViral: 0 });
  });

  it('les indicateurs sont donnés à Claude', () => {
    const [v] = classerTendances(
      [{ ...base, titre: 'Perce', vues: 10_000, abonnes: 800 }],
      maintenant,
    );
    const p = promptSujets({ videos: [v!], nombre: 3 });
    expect(p.demande).toMatch(/score viral \d+\/100/);
    expect(p.demande).toMatch(/×12\.5 abonnés/);
    expect(p.demande).toMatch(/engagement 1\.0 %/);
    expect(p.systeme).toMatch(/potentiel viral de 1 à 10/);
  });
});

describe('déclinaisons d’un sujet', () => {
  it('même thème, accroches différentes', async () => {
    const { promptDeclinaisons } = await import('./prompts');
    const p = promptDeclinaisons({
      sujet: {
        titre: '10 demandes gratuites',
        angle: 'a',
        pourquoi: 'p',
        accroches: ['h'],
        dureeCibleS: 30,
        script: [
          { voix: 'v', aEcran: 'camera', texteEcran: '' },
          { voix: 'w', aEcran: 'ecran', texteEcran: '' },
        ],
        legende: 'l',
        hashtags: [],
        potentielViral: 8,
        vuesVisees: { min: 1, max: 2 },
        abonnesVises: 3,
        inspirations: [],
        miniature: { texte: 'x', accent: '' },
      },
      nombre: 5,
      videos: [],
    });
    expect(p.demande).toMatch(/Décline-le en 5 vidéos/);
    expect(p.demande).toMatch(/10 demandes gratuites/);
    expect(p.demande).toMatch(/aucune donnée disponible/);
  });
});

describe('liens des vidéos', () => {
  it('format Shorts, identifiant encodé', async () => {
    const { lienVideo } = await import('./tendances');
    expect(lienVideo('abc123')).toBe('https://www.youtube.com/shorts/abc123');
    expect(lienVideo('a/b')).toBe('https://www.youtube.com/shorts/a%2Fb');
  });
});

describe('sujets nourris par vos résultats', () => {
  it('les résultats réels de vos vidéos passent dans la demande', () => {
    const p = promptSujets({ videos: [], nombre: 3, vosVideos: '- « A » (youtube) : 12 vues' });
    expect(p.demande).toContain('Résultats réels de NOS vidéos');
    expect(p.demande).toContain('« A »');
    expect(promptSujets({ videos: [], nombre: 3 }).demande).not.toContain('NOS vidéos');
  });
});

describe('séries', () => {
  const serie = {
    nom: 'Les erreurs de devis',
    promesse: 'Une erreur qui coûte cher, par épisode',
    numero: 3,
    precedents: ['Oublier la TVA', 'Pas d’acompte'],
  };
  it('sujets : épisode suivant, sans refaire les précédents, appel à suivre la série', () => {
    const p = promptSujets({ videos: [], nombre: 3, serie });
    expect(p.demande).toContain('Série « Les erreurs de devis » : épisode 3');
    expect(p.demande).toContain('- Oublier la TVA');
    expect(p.systeme).toContain('épisode suivant');
  });
  it('montage : repère d’épisode au début et appel à s’abonner à la fin', () => {
    const p = promptMontage({
      format: 'vertical',
      camera: false,
      dureePriseMs: 20_000,
      transcription: '',
      segments: [],
      sujet: null,
      serie,
    });
    expect(p.demande + p.systeme).toContain('« Les erreurs de devis · épisode 3 »');
  });
});

describe('commentaires', () => {
  it('les questions des commentaires deviennent des sujets « réponse en vidéo »', () => {
    const p = promptSujets({
      videos: [],
      nombre: 3,
      commentaires: [
        { texte: 'Et pour les plombiers ça marche ?', likes: 12, video: 'Demandes gratuites' },
      ],
    });
    expect(p.demande).toContain('Commentaires reçus sous nos vidéos');
    expect(p.demande).toContain(
      '« Et pour les plombiers ça marche ? » (12 j’aime, sous « Demandes gratuites »)',
    );
    expect(p.systeme).toContain('réponse en vidéo');
  });
});

describe('vidéo sans voix ni image', () => {
  it('Claude est prévenu : textes à l’écran, musique, pas de sous-titres', () => {
    const p = promptMontage({
      format: 'vertical',
      camera: false,
      ecran: false,
      voix: false,
      dureePriseMs: 30_000,
      transcription: '',
      segments: [],
      sujet: null,
    });
    expect(p.demande).toContain('Voix : aucune');
    expect(p.demande).toMatch(/sousTitres.*false/);
    expect(p.demande).toMatch(/musique.*true/);
  });
});
