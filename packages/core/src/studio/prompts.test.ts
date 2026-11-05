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
          vuesParJour: 12_000,
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
    ]);
  });
});
