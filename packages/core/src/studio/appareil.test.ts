import { describe, expect, it } from 'vitest';
import {
  appareilDuFormat,
  appareilsVisibles,
  creerFrise,
  dessinerDessousFrise,
  ecranAppareil,
  friseDepuisPlan,
  FORMATS_STUDIO,
  NOMS_FORMATS,
  poserClip,
  rectangleClip,
  type ContexteImage,
  type PlanMontage,
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
  const ctx = new Proxy({ globalAlpha: 1 } as Record<string, unknown>, {
    get(cible, cle: string) {
      if (cle in cible) return cible[cle];
      return (...a: unknown[]) => {
        if (cle === 'fillRect' || cle === 'arc' || cle === 'lineTo')
          appels.push(
            `${cle} ${String(cible.fillStyle)} ${a.map((n) => Math.round(n as number)).join(',')}`,
          );
      };
    },
    set(cible, cle: string, v) {
      cible[cle] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as ContexteImage, appels };
}

describe('écran dans un appareil', () => {
  it('écran dans l’image, pixels pairs, proportions de l’appareil', () => {
    for (const format of NOMS_FORMATS)
      for (const a of ['ordinateur', 'telephone'] as const) {
        const e = ecranAppareil(format, a);
        const { largeur: L, hauteur: H } = FORMATS_STUDIO[format];
        expect(e.x).toBeGreaterThan(0);
        expect(e.y).toBeGreaterThan(0);
        expect(e.x + e.largeur).toBeLessThan(L);
        expect(e.y + e.hauteur).toBeLessThan(H);
        for (const v of Object.values(e)) expect(v % 2).toBe(0);
        const ratio = e.largeur / e.hauteur;
        expect(ratio).toBeCloseTo(a === 'telephone' ? 9 / 16 : 16 / 9, 1);
      }
    expect(appareilDuFormat('vertical')).toBe('telephone');
    expect(appareilDuFormat('horizontal')).toBe('ordinateur');
    expect(appareilDuFormat('carre')).toBe('ordinateur');
  });

  it('le clip se pose à la place de l’écran (le cadre est ignoré)', () => {
    const cadre = { x: 0, y: 0, largeur: 0.5, hauteur: 0.5, opacite: 1 };
    expect(rectangleClip('vertical', { cadre, appareil: 'telephone' })).toEqual(
      ecranAppareil('vertical', 'telephone'),
    );
    expect(rectangleClip('vertical', { cadre }).largeur).toBe(540);
  });

  it('dessous : fond uni sans appareil, fond animé et corps de l’appareil sinon', () => {
    let f = creerFrise('horizontal', 'T');
    const v = f.pistes.find((p) => p.type === 'video')!.id;
    f = poserClip(f, v, {
      id: 'k',
      debut: 0,
      duree: 4_000,
      source: { type: 'capture', captureId: 'c1', debutSource: 0 },
      appareil: 'ordinateur',
    });
    expect(appareilsVisibles(f, 1_000)).toEqual(['ordinateur']);
    expect(appareilsVisibles(f, 5_000)).toEqual([]);
    const sans = faux();
    dessinerDessousFrise(sans.ctx, f, 5_000, theme);
    expect(sans.appels).toEqual(['fillRect #000 0,0,1920,1080']);
    const avec = faux();
    dessinerDessousFrise(avec.ctx, f, 1_000, theme);
    expect(avec.appels[0]).toBe('fillRect #111 0,0,1920,1080');
    // Halos et motif de points, puis le corps et le socle de l'ordinateur.
    expect(avec.appels.filter((a) => a.startsWith('arc')).length).toBeGreaterThan(30);
    expect(avec.appels.some((a) => a.startsWith('lineTo #000'))).toBe(true);
    // Téléphone : un corps arrondi, pas de socle.
    const tel = faux();
    dessinerDessousFrise(
      tel.ctx,
      {
        ...f,
        pistes: f.pistes.map((p) => ({
          ...p,
          clips: p.clips.map((c) => ({ ...c, appareil: 'telephone' as const })),
        })),
      },
      1_000,
      theme,
    );
    expect(tel.appels.filter((a) => a.startsWith('lineTo #000')).length).toBe(4);
  });

  it('un plan de Claude garde l’appareil de ses captures (pas pour un carton)', () => {
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
          camera: 'cachee',
          calques: [],
        },
        {
          id: 'p2',
          source: { debut: 6_000, fin: 12_000 },
          visuel: 'carton',
          carton: 'Fin',
          appareil: 'telephone',
          camera: 'cachee',
          calques: [],
        },
      ],
      captures: [{ id: 'c1', scene: 'fiche_publique' }],
      artisan: null,
      sousTitres: false,
      musique: false,
    };
    const f = friseDepuisPlan(plan, { voix: false, dureePriseMs: 12_000 });
    const clips = f.pistes.flatMap((p) => p.clips);
    expect(clips.find((c) => c.id === 'p1-v')?.appareil).toBe('telephone');
    expect(clips.find((c) => c.id === 'p2-v')?.appareil).toBeUndefined();
  });
});
