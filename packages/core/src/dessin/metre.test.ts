import { describe, expect, it } from 'vitest';
import { exterieur, niveau as schemaNiveau, type Niveau } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette } from './aidesTest';
import { ajouterMur } from './commandes';
import { mursDepuisForme } from './formes';
import { LIBELLES_POSTE, metreNiveau, POSTES_METRE } from './metre';
import { detecterPieces } from './pieces';
import { alertesEscaliers, alertesTerrasses } from './validations';

const ligne = (n: Niveau, poste: string, famille?: string) =>
  metreNiveau(n).find((l) => l.poste === poste && (famille === undefined || l.famille === famille));

describe('formes', () => {
  const options = { epaisseur: 300, hauteur: 2500, nouvelId: contexteTest().nouvelId };
  const surface = (f: Parameters<typeof mursDepuisForme>[0]) => {
    const r = mursDepuisForme(f, options);
    if (!r.ok) throw new Error(r.message);
    return detecterPieces(r.data)[0]!.surface;
  };

  it('rectangle, L, U et T : surface intérieure exacte', () => {
    expect(surface({ forme: 'rectangle', largeur: 10_600, profondeur: 8_600 })).toBe(80_000_000);
    const decoupe = { largeur: 4_000, profondeur: 3_000 };
    // L : 10,00 × 8,00 m moins 4,00 × 3,00 m découpés (les murs suivent la découpe).
    expect(surface({ forme: 'L', largeur: 10_600, profondeur: 8_600, decoupe })).toBe(
      80_000_000 - 4_000 * 3_000,
    );
    // U : l'échancrure est bordée de murs des deux côtés, 4,00 + 2 × 0,30 m de large.
    expect(surface({ forme: 'U', largeur: 10_600, profondeur: 8_600, decoupe })).toBe(
      80_000_000 - 4_600 * 3_000,
    );
    expect(
      surface({
        forme: 'T',
        largeur: 10_600,
        profondeur: 8_600,
        decoupe: { largeur: 2_000, profondeur: 3_000 },
      }),
    ).toBe(80_000_000 - 2 * 2_000 * 3_000);
  });

  it('refuse des dimensions ou des découpes impossibles', () => {
    expect(
      mursDepuisForme({ forme: 'rectangle', largeur: 1_000, profondeur: 8_000 }, options),
    ).toMatchObject({ ok: false });
    const grand = { largeur: 10_000, profondeur: 3_000 };
    expect(
      mursDepuisForme({ forme: 'L', largeur: 10_600, profondeur: 8_600, decoupe: grand }, options),
    ).toMatchObject({ ok: false });
    expect(
      mursDepuisForme({ forme: 'U', largeur: 10_600, profondeur: 8_600, decoupe: grand }, options),
    ).toMatchObject({ ok: false });
    expect(
      mursDepuisForme({ forme: 'T', largeur: 10_600, profondeur: 8_600, decoupe: grand }, options),
    ).toMatchObject({ ok: false });
    expect(
      mursDepuisForme(
        { forme: 'L', largeur: 10_600, profondeur: 8_600, decoupe: { largeur: 0, profondeur: 1 } },
        options,
      ),
    ).toMatchObject({ ok: false });
  });
});

describe('metreNiveau', () => {
  it('pièce de la maquette : sol, plafond, murs, plinthes', () => {
    const n = niveauMaquette();
    expect(ligne(n, 'sol')).toMatchObject({
      quantite: 80_000_000,
      unite: 'm2',
      prestationId: null,
    });
    expect(ligne(n, 'plafond')!.quantite).toBe(80_000_000);
    // 4 murs vus de l'intérieur seulement : (10,30 + 8,30) × 2 × 2,50 m (longueurs d'axe).
    expect(ligne(n, 'murs')!.quantite).toBe((10_300 + 8_300) * 2 * 2_500);
    expect(ligne(n, 'plinthes')).toMatchObject({ quantite: 36_000, unite: 'ml' });
    expect(ligne(n, 'cloisons')).toBeUndefined();
  });

  it('revêtements rattachés aux prestations, portes déduites des plinthes, cloisons', () => {
    const ctx = contexteTest();
    const base = niveauMaquette(ctx);
    const r = ajouterMur(
      base,
      { a: { x: 150, y: 4300 }, b: { x: 10450, y: 4300 }, type: 'cloison' },
      ctx,
    );
    if (!r.ok) throw new Error(r.message);
    const cloison = r.data.murs.at(-1)!;
    const n: Niveau = {
      ...r.data,
      pieces: r.data.pieces.map((p, i) => ({
        ...p,
        sol: { famille: i === 0 ? 'parquet' : 'carrelage' },
      })),
      murs: r.data.murs.map((m) =>
        m.id === cloison.id ? { ...m, faceA: { famille: 'papier_peint' } } : m,
      ),
      ouvertures: [
        {
          id: 'o_porte01',
          murId: cloison.id,
          position: 1000,
          largeur: 830,
          hauteur: 2040,
          allege: 0,
          type: 'porte',
          sens: 'gauche',
          cote: 'interieur',
          volet: null,
        },
        {
          id: 'o_entree1',
          murId: base.murs[2]!.id,
          position: 1000,
          largeur: 900,
          hauteur: 2150,
          allege: 0,
          type: 'porte_entree',
          sens: 'gauche',
          cote: 'interieur',
          volet: null,
        },
        {
          id: 'o_fenetre',
          murId: base.murs[0]!.id,
          position: 2000,
          largeur: 1200,
          hauteur: 1250,
          allege: 950,
          type: 'fenetre',
          sens: 'gauche',
          cote: 'interieur',
          volet: 'roulant',
        },
      ],
    };
    expect(ligne(n, 'sol', 'parquet')!.prestationId).toBe('parquet');
    expect(ligne(n, 'sol', 'carrelage')!.prestationId).toBeNull();
    expect(ligne(n, 'murs', 'papier_peint')!.prestationId).toBe('papier-peint');
    expect(ligne(n, 'cloisons')).toMatchObject({ quantite: 10_300, prestationId: 'cloison' });
    expect(ligne(n, 'portes_interieures')).toMatchObject({
      quantite: 1,
      prestationId: 'portes-interieures',
    });
    expect(ligne(n, 'porte_entree')).toMatchObject({ quantite: 1, prestationId: 'porte-entree' });
    expect(ligne(n, 'fenetres')!.quantite).toBe(1);
    // Porte intérieure : 2 faces ; porte d'entrée : 1 face ; fenêtre (allège) : rien.
    const sansPortes = metreNiveau({ ...n, ouvertures: [] }).find(
      (l) => l.poste === 'plinthes',
    )!.quantite;
    expect(ligne(n, 'plinthes')!.quantite).toBe(sansPortes - 2 * 830 - 900);
  });

  it('extérieur et escaliers', () => {
    const n: Niveau = {
      ...schemaNiveau.parse({ id: 'n_ext0', nom: 'RDC', type: 'rdc', altitude: 0 }),
      exterieur: exterieur.parse({
        terrasses: [
          {
            id: 'te_terr',
            contour: [
              { x: 0, y: 0 },
              { x: 4000, y: 0 },
              { x: 4000, y: 3000 },
              { x: 0, y: 3000 },
            ],
            hauteur: 1200,
          },
        ],
        piscines: [
          {
            id: 'pi_pisc',
            forme: 'rectangle',
            position: { x: 0, y: 0 },
            longueur: 8000,
            largeur: 4000,
            profondeurMin: 1200,
            profondeurMax: 1800,
          },
        ],
      }),
      escaliers: [
        {
          id: 'esc_un',
          type: 'droit',
          position: { x: 0, y: 0 },
          rotation: 0,
          largeur: 900,
          hauteurAMonter: 2700,
          nbMarches: 15,
          giron: 250,
          sens: 'droite',
          gardeCorps: true,
          structure: 'pleine',
          materiau: 'bois',
          virage: 'balance',
        },
      ],
    };
    expect(ligne(n, 'terrasse')).toMatchObject({ quantite: 12_000_000, prestationId: 'terrasse' });
    expect(ligne(n, 'piscine')!.quantite).toBe(1);
    expect(ligne(n, 'escalier')!.quantite).toBe(1);
    expect(alertesTerrasses(n)).toEqual([
      expect.objectContaining({ code: 'garde_corps', elementId: 'te_terr' }),
    ]);
    // 2 × 18 + 25 = 61 cm : confortable.
    expect(alertesEscaliers(n)).toEqual([]);
    expect(alertesEscaliers(n, 1_800).map((a) => a.code)).toEqual(['echappee']);
    const raide = { ...n, escaliers: [{ ...n.escaliers[0]!, nbMarches: 10, giron: 180 }] };
    expect(alertesEscaliers(raide).map((a) => a.code)).toEqual([
      'blondel',
      'hauteur_marche',
      'giron',
    ]);
    const meunier = { ...n, escaliers: [{ ...n.escaliers[0]!, type: 'meunier' as const }] };
    expect(alertesEscaliers(meunier, 1_800)).toEqual([]);
  });

  it('libellés de tous les postes', () => {
    expect(POSTES_METRE.every((p) => LIBELLES_POSTE[p].length > 0)).toBe(true);
  });
});
