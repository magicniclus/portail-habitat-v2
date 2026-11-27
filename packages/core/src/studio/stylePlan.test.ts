import { describe, expect, it } from 'vitest';
import { friseDepuisPlan, grapheFrise, planSelonStyle, type PlanMontage } from './index';

const t = { debut: 0, fin: 2_000 };
const plan: PlanMontage = {
  format: 'vertical',
  titre: 'T',
  plans: [
    {
      id: 'p1',
      source: { debut: 0, fin: 6_000 },
      visuel: 'capture',
      captureId: 'c1',
      appareil: 'telephone',
      zoom: { x: 0.1, y: 0.1, largeur: 0.5 },
      camera: 'cachee',
      calques: [
        { type: 'texte', texte: 'Gratuit', style: 'titre', position: 'haut', ...t },
        { type: 'tampon', texte: 'Gratuit', position: 'centre', ...t },
        { type: 'fin', titre: 'Trop tôt', bouton: 'x', ...t },
      ],
    },
    {
      id: 'p2',
      source: { debut: 6_000, fin: 12_000 },
      visuel: 'capture',
      captureId: 'c1',
      camera: 'cachee',
      calques: [{ type: 'fin', titre: 'Inscrivez-vous', bouton: 'portail-travaux.fr', ...t }],
    },
  ],
  captures: [{ id: 'c1', scene: 'fiche_publique' }],
  artisan: null,
  sousTitres: false,
  musique: true,
};

describe('plan selon le style', () => {
  it('écran filmé : textes et fin seulement, ni appareil, ni zoom, ni musique', () => {
    const p = planSelonStyle(plan, 'ecran');
    expect(p.musique).toBe(false);
    expect(p.plans[0]).not.toHaveProperty('appareil');
    expect(p.plans[0]).not.toHaveProperty('zoom');
    expect(p.plans[0]!.calques.map((c) => c.type)).toEqual(['texte']);
    expect(p.plans[1]!.calques.map((c) => c.type)).toEqual(['fin']);
  });

  it('styles animés : tout est gardé, sauf la musique', () => {
    const p = planSelonStyle(plan, 'pose');
    expect(p.musique).toBe(false);
    expect(p.plans[0]!.calques).toHaveLength(3);
    expect(p.plans[0]!.appareil).toBe('telephone');
  });
});

describe('écran filmé dans la frise', () => {
  it('un même écran continue d’un plan à l’autre et se fige s’il est trop court', () => {
    const f = friseDepuisPlan(planSelonStyle(plan, 'ecran'), { voix: false, dureePriseMs: 12_000 });
    const clips = f.pistes.flatMap((x) => x.clips);
    const debut = (id: string) => {
      const s = clips.find((c) => c.id === id)!.source;
      return 'debutSource' in s ? s.debutSource : -1;
    };
    expect(debut('p1-v')).toBe(0);
    expect(debut('p2-v')).toBe(6_000);
    const g = grapheFrise(
      f,
      {
        'p1-v': { index: 2, largeur: 1080, hauteur: 1920, son: false, fixe: false },
        'p2-v': { index: 3, largeur: 1080, hauteur: 1920, son: false, fixe: false },
      },
      { silence: 1, surcouche: null, musique: null },
    );
    expect(g).toContain('tpad=stop_mode=clone:stop_duration=6');
  });
});
