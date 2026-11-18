import { describe, expect, it } from 'vitest';
import type { Scene } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { nouvelleScene } from './migrations';
import {
  ajouterNiveau,
  deplacerNiveau,
  niveauxTries,
  reglerNiveau,
  supprimerNiveau,
} from './niveaux';

const ctx = contexteTest();
const base = (): Scene => ({
  ...nouvelleScene(ctx.nouvelId),
  niveaux: [{ ...niveauMaquette(ctx), id: 'n_rdc0', type: 'rdc', altitude: 0 }],
});
const alts = (s: Scene) => niveauxTries(s).map((n) => [n.nom, n.altitude]);

describe('niveaux : ordre et hauteurs (DES-04)', () => {
  it('trois niveaux empilés ; supprimer un étage du milieu recale le dessus', () => {
    let s = ok(ajouterNiveau(base(), { type: 'etage', copierMurs: false }, ctx));
    s = ok(ajouterNiveau(s, { type: 'etage', copierMurs: false }, ctx));
    expect(alts(s).map((x) => x[1])).toEqual([0, 2_700, 5_400]);
    const milieu = niveauxTries(s)[1]!.id;
    expect(alts(ok(supprimerNiveau(s, milieu)))).toEqual([
      ['RDC', 0],
      ['Étage 2', 2_700],
    ]);
  });

  it('réordonner : le rez-de-chaussée reste à 0, les autres se reposent', () => {
    let s = ok(ajouterNiveau(base(), { type: 'etage', copierMurs: false }, ctx));
    s = ok(ajouterNiveau(s, { type: 'combles', copierMurs: false }, ctx));
    const combles = niveauxTries(s)[2]!.id;
    const r = ok(deplacerNiveau(s, combles, -1));
    expect(alts(r)).toEqual([
      ['RDC', 0],
      ['Combles', 2_700],
      ['Étage 1', 5_100],
    ]);
    expect(deplacerNiveau(s, combles, 1)).toMatchObject({ code: 'PRECONDITION' });
    expect(deplacerNiveau(s, 'n_absent', 1)).toMatchObject({ code: 'INTROUVABLE' });
    // Le rez-de-chaussée monté au-dessus d'un sous-sol garde son altitude.
    const ss = ok(ajouterNiveau(base(), { type: 'sous_sol', copierMurs: false }, ctx));
    expect(alts(ok(deplacerNiveau(ss, 'n_rdc0', -1)))).toEqual([
      ['RDC', 0],
      ['Sous-sol', 2_700],
    ]);
  });

  it('hauteur sous plafond : les murs pleins et les niveaux du dessus suivent', () => {
    const s = ok(ajouterNiveau(base(), { type: 'etage', copierMurs: false }, ctx));
    const r = ok(reglerNiveau(s, 'n_rdc0', { hauteurSousPlafond: 2_800, epaisseurPlancher: 250 }));
    const rdc = r.niveaux.find((n) => n.id === 'n_rdc0')!;
    expect(rdc.murs.every((m) => m.hauteur === 2_800)).toBe(true);
    expect(alts(r)[1]![1]).toBe(3_050);
    expect(reglerNiveau(s, 'n_rdc0', { hauteurSousPlafond: 1_000 })).toMatchObject({ ok: false });
    expect(reglerNiveau(s, 'n_rdc0', { epaisseurPlancher: 2_000 })).toMatchObject({ ok: false });
    expect(reglerNiveau(s, 'n_absent', {})).toMatchObject({ code: 'INTROUVABLE' });
  });
});
