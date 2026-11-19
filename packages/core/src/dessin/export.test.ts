import { describe, expect, it } from 'vitest';
import type { Scene } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette } from './aidesTest';
import {
  cadreImpression,
  cleLigneMetre,
  echelleConseillee,
  libelleLigneMetre,
  menuiseriesScene,
  metreCsv,
  metreScene,
  miseEnPage,
  quantiteMetre,
} from './export';
import { metreNiveau } from './metre';
import { nouvelleScene } from './migrations';

const ctx = contexteTest();
const maison = (niveaux = 1): Scene => {
  const n = niveauMaquette(ctx);
  return {
    ...nouvelleScene(ctx.nouvelId),
    niveaux: Array.from({ length: niveaux }, (_, i) => ({
      ...n,
      id: `n_niv${i}000`,
      nom: i ? `Étage ${i}` : 'RDC',
      altitude: i * 2_700,
    })),
  };
};

describe('métré de la maison et CSV (DES-43)', () => {
  it('additionne les niveaux, ligne par ligne', () => {
    const un = metreScene(maison());
    const deux = metreScene(maison(2));
    expect(un).toEqual(metreNiveau(maison().niveaux[0]!));
    const sol = (l: typeof un) => l.find((x) => x.poste === 'sol')!.quantite;
    expect(sol(deux)).toBe(2 * sol(un));
    expect(new Set(deux.map(cleLigneMetre)).size).toBe(deux.length);
    expect(menuiseriesScene(maison(2))).toEqual([]);
  });

  it('libellés, quantités lisibles, CSV pour Excel', () => {
    const l = metreScene(maison());
    const sol = l.find((x) => x.poste === 'sol')!;
    expect(libelleLigneMetre(sol)).toBe('Revêtement de sol');
    expect(quantiteMetre(sol)).toBe('80,0 m²');
    expect(
      libelleLigneMetre({ poste: 'equipements', quantite: 1, unite: 'u', prestationId: 'wc' }),
    ).toBe('WC');
    expect(
      quantiteMetre({ poste: 'plinthes', quantite: 1_250, unite: 'ml', prestationId: null }),
    ).toBe('1,25 m');
    expect(quantiteMetre({ poste: 'escalier', quantite: 2, unite: 'u', prestationId: null })).toBe(
      '2',
    );
    const csv = metreCsv(
      [sol, { poste: 'plinthes', quantite: 1_250, unite: 'ml', prestationId: null }],
      [{ libelle: 'Fenêtre "2 vantaux"; PVC', nombre: 3 }],
    );
    expect(csv.startsWith('﻿Poste;Quantité;Unité;Prestation\r\n')).toBe(true);
    expect(csv).toContain('Revêtement de sol;80,00;m²;');
    expect(csv).toContain('Plinthes;1,25;m;\r\n');
    expect(csv).toContain('"Menuiserie : Fenêtre ""2 vantaux""; PVC";3;u;');
  });
});

describe('mise en page à l’échelle (DES-41)', () => {
  const cadre = cadreImpression(maison().niveaux[0]!)!;

  it('maison de 10,60 m : au 1/50 en A3 (pas en A4), centrée ; trop grande : refus clair', () => {
    expect(cadre.l).toBe(10_300 + 3_000); // axes des murs + 1,50 m de chaque côté
    expect(miseEnPage(cadre, 50, 'A4').ok).toBe(false);
    const m = miseEnPage(cadre, 50, 'A3');
    expect(m.ok && m.data.k).toBe(1 / 50);
    if (!m.ok) return;
    expect(m.data.origine.x + cadre.l / 50 / 2).toBeCloseTo(420 / 2);
    const grand = { ...cadre, l: 30_000 };
    const r = miseEnPage(grand, 50, 'A4');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/A3/);
    const r3 = miseEnPage({ ...cadre, l: 50_000 }, 100, 'A3');
    expect(!r3.ok && r3.message).not.toMatch(/le A3/);
    expect(echelleConseillee(cadre)).toEqual({ echelle: 50, format: 'A3' });
    expect(echelleConseillee({ ...grand, l: 40_000 })).toEqual({ echelle: 100, format: 'A3' });
    expect(echelleConseillee({ ...cadre, l: 90_000 })).toBeNull();
    expect(cadreImpression(nouvelleScene(ctx.nouvelId).niveaux[0]!)).toBeNull();
  });
});
