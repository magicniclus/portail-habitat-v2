import { describe, expect, it } from 'vitest';
import {
  FORMATS_VIRAUX,
  RECHERCHES_EXTERIEURES,
  SCHEMA_JSON_SUJETS,
  promptSujets,
  sujetStudio,
  type VideoTendance,
} from './index';

const video = (titre: string, niche: 'batiment' | 'externe'): VideoTendance => ({
  id: titre,
  titre,
  chaine: 'C',
  vues: 1_000_000,
  likes: 50_000,
  commentaires: 1_000,
  dureeS: 40,
  publieeLe: '2026-11-01T00:00:00Z',
  description: '',
  abonnes: 20_000,
  vuesParJour: 200_000,
  engagement: 0.05,
  multiplicateur: 50,
  scoreViral: 90,
  niche,
});

describe('créativité : concepts venus d’ailleurs', () => {
  it('un catalogue de formats viraux et des recherches hors bâtiment', () => {
    expect(FORMATS_VIRAUX.length).toBeGreaterThanOrEqual(15);
    expect(new Set(FORMATS_VIRAUX.map((f) => f.nom)).size).toBe(FORMATS_VIRAUX.length);
    expect(RECHERCHES_EXTERIEURES.length).toBeGreaterThanOrEqual(5);
  });

  it('la demande sépare les vidéos du métier et celles d’ailleurs, et exige un concept transposé', () => {
    const p = promptSujets({
      videos: [
        video('Je cuisine 24 h avec 5 €', 'externe'),
        video('Plombier : mes tarifs', 'batiment'),
      ],
      nombre: 3,
    });
    expect(p.demande).toContain('Hors bâtiment');
    expect(p.demande).toContain('« Je cuisine 24 h avec 5 € »');
    expect(p.systeme).toMatch(/au moins la moitié/i);
    expect(p.contexte).toContain(FORMATS_VIRAUX[0]!.nom);
  });

  it('il apprend de vos choix : idées choisies, gardées et ignorées', () => {
    const p = promptSujets({
      videos: [],
      nombre: 3,
      gouts: { choisis: ['A'], gardes: ['B'], ignores: ['C'] },
    });
    expect(p.demande).toContain('choisies : « A »');
    expect(p.demande).toContain('gardées pour plus tard : « B »');
    expect(p.demande).toContain('ignorées : « C »');
  });

  it('le concept fait partie de la sortie (anciennes idées sans concept acceptées)', () => {
    const sujets = (
      SCHEMA_JSON_SUJETS as { properties: { sujets: { items: { required: string[] } } } }
    ).properties.sujets.items.required;
    expect(sujets).toContain('concept');
    const base = {
      titre: 't',
      angle: 'a',
      pourquoi: 'p',
      accroches: ['x'],
      dureeCibleS: 30,
      script: [
        { voix: 'v', aEcran: 'camera', texteEcran: '' },
        { voix: 'w', aEcran: 'ecran', texteEcran: '' },
      ],
      legende: 'l',
      hashtags: [],
      potentielViral: 5,
      vuesVisees: { min: 1, max: 2 },
      abonnesVises: 1,
      inspirations: [],
      miniature: { texte: 'm', accent: '' },
    };
    expect(sujetStudio.safeParse(base).success).toBe(true);
    expect(
      sujetStudio.safeParse({
        ...base,
        concept: {
          format: 'Défi 24 h',
          source: 'Je cuisine 24 h avec 5 €',
          transposition: 'Un artisan…',
        },
      }).success,
    ).toBe(true);
  });
});
