import { describe, expect, it } from 'vitest';
import {
  accrochePrincipale,
  appliquerVariante,
  classerReels,
  decrochage,
  diagnosticVideo,
  meilleuresHeures,
  promptSujets,
  resumeVosVideos,
  verifierPlan,
  type PlanMontage,
} from './index';

const plan = (plans: PlanMontage['plans'], surcharge: Partial<PlanMontage> = {}): PlanMontage => ({
  format: 'vertical',
  titre: 'T',
  plans,
  captures: [],
  artisan: null,
  sousTitres: true,
  musique: false,
  ...surcharge,
});
const ecran = (id: string, debut: number, fin: number): PlanMontage['plans'][number] => ({
  id,
  source: { debut, fin },
  visuel: 'ecran',
  camera: 'cachee',
  calques: [],
});

describe('cas limites du Studio', () => {
  it('variantes : plan vide, texte tardif conservé, carton sans texte, sans miniature', () => {
    const vide = { ...plan([ecran('a', 0, 12_000)]), plans: [] } as unknown as PlanMontage;
    expect(appliquerVariante(vide, { id: 'v', accroche: 'X' }).plans).toEqual([]);
    expect(accrochePrincipale(vide)).toBeNull();
    const p = plan([
      {
        ...ecran('a', 0, 12_000),
        calques: [
          { type: 'compteur', de: 0, a: 5, libelle: 'n', position: 'centre', debut: 0, fin: 500 },
          {
            type: 'texte',
            texte: 'Tard',
            style: 'note',
            position: 'bas',
            debut: 5_000,
            fin: 6_000,
          },
        ],
      },
    ]);
    const v = appliquerVariante(p, {
      id: 'v',
      accroche: 'Nouveau',
      miniature: { texte: 'M', accent: '' },
    });
    expect(v.plans[0]!.calques.map((c) => c.type)).toEqual(['texte', 'compteur', 'texte']);
    expect(v.miniature).toBeUndefined();
    const carton = plan([{ ...ecran('a', 0, 12_000), visuel: 'carton' }]);
    expect(accrochePrincipale(carton)).toBeNull();
  });

  it('variantes en double refusées', () => {
    const p = plan([ecran('a', 0, 12_000)], {
      variantes: [
        { id: 'v', accroche: 'A' },
        { id: 'v', accroche: 'B' },
      ],
    });
    expect(verifierPlan(p, { dureePriseMs: 20_000, camera: false }).join(' ')).toMatch(/double/);
  });

  it('résultats : courbe plate, chute tardive, résumé long', () => {
    expect(decrochage(Array(20).fill(0.5), 20)).toBeNull();
    const courbe = Array.from({ length: 100 }, (_, i) => (i < 50 ? 1 : 0.6));
    expect(
      diagnosticVideo({ retention: 0.8, dureeS: 60, courbe, vues: 100, abonnesGagnes: 3 })[0],
    ).toMatch(/Grosse chute à 29,1 s/);
    const videos = Array.from({ length: 12 }, (_, i) => ({
      titre: `V${i}`,
      reseau: 'youtube',
      vues: i,
      retention: null,
      abonnesGagnes: null,
      accroche: null,
    }));
    const r = resumeVosVideos(videos).split('\n');
    expect(r).toHaveLength(10);
    expect(r[0]).toContain('V11');
    expect(r.at(-1)).toContain('V0');
  });

  it('meilleures heures : égalité départagée par l’heure', () => {
    expect(
      meilleuresHeures([
        { heure: 18, score: 5 },
        { heure: 18, score: 5 },
        { heure: 9, score: 5 },
        { heure: 9, score: 5 },
      ]),
    ).toEqual([9, 18]);
  });

  it('Reels : j’aime masqués, série sans épisode précédent', () => {
    const reels = classerReels(
      [
        {
          lien: 'l',
          legende: 'x',
          likes: null,
          commentaires: 2,
          publieeLe: '2026-11-01T00:00:00Z',
          hashtag: 'btp',
        },
      ],
      Date.UTC(2026, 10, 2),
    );
    const p = promptSujets({
      videos: [],
      nombre: 1,
      reels,
      serie: { nom: 'S', promesse: 'P', numero: 1, precedents: [] },
    });
    expect(p.demande).toContain('? j’aime');
    expect(p.demande).toContain('(aucun)');
  });
});
