import { describe, expect, it } from 'vitest';
import type { Scene } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { avecPieces } from './commandes';
import { definirToiture, toitureAutomatique } from './commandesToit';
import { mursDepuisForme } from './formes';
import { nouvelleScene } from './migrations';
import { ajouterNiveau } from './niveaux';
import { toituresSuivies } from './toitSuit';
import { emprisesToit } from './toitures';

describe('le toit suit les murs (DES-16)', () => {
  const ctx = contexteTest();
  // Maison en L au rez-de-chaussée : maison 10,60 × 8,60 et une aile accolée à droite.
  const aile = mursDepuisForme(
    { forme: 'rectangle', largeur: 4_000, profondeur: 6_000 },
    { epaisseur: 300, hauteur: 2_500, nouvelId: ctx.nouvelId },
  );
  if (!aile.ok) throw new Error(aile.message);
  const rdc = niveauMaquette(ctx);
  const murs = [
    ...rdc.murs,
    ...aile.data.map((m) => ({
      ...m,
      a: { x: m.a.x + 10_600, y: m.a.y + 2_600 },
      b: { x: m.b.x + 10_600, y: m.b.y + 2_600 },
    })),
  ];
  const base = (): Scene => ({
    ...nouvelleScene(ctx.nouvelId),
    niveaux: [avecPieces({ ...rdc, murs, id: 'n_rdc0', type: 'rdc', altitude: 0 }, ctx)],
  });

  it('les murs de l’étage effacés au-dessus d’une partie : elle reçoit le toit', () => {
    // Étage complet (L entier), toit automatique : le rez-de-chaussée n'en a pas besoin.
    const { niveauId: _n, ...avecEtage } = ok(
      ajouterNiveau(base(), { type: 'etage', copierMurs: true }, ctx),
    );
    const s: Scene = ok(toitureAutomatique(avecEtage, 'deux_pans'));
    const rdcId = 'n_rdc0';
    expect(s.niveaux.find((n) => n.id === rdcId)!.toiture).toBeNull();
    // On efface l'aile à l'étage : la partie du rez-de-chaussée dessous est découverte.
    const etage = s.niveaux.find((n) => n.id !== rdcId)!;
    const sansAile = {
      ...s,
      niveaux: s.niveaux.map((n) =>
        n.id === etage.id
          ? avecPieces({ ...n, murs: n.murs.filter((m) => Math.max(m.a.x, m.b.x) <= 10_600) }, ctx)
          : n,
      ),
    };
    const suivi = toituresSuivies(s, sansAile);
    const bas = suivi.niveaux.find((n) => n.id === rdcId)!;
    expect(bas.toiture?.type).toBe('deux_pans');
    const dessus = suivi.niveaux.find((n) => n.id === etage.id)!;
    expect(emprisesToit(bas, dessus).length).toBeGreaterThan(0);
  });

  it('un toit retiré exprès reste retiré ; sans toit dans la maison, rien ne change', () => {
    const s = ok(ajouterNiveau(base(), { type: 'etage', copierMurs: false }, ctx));
    expect(toituresSuivies(s, s)).toBe(s);
    const avecToit = {
      ...s,
      niveaux: s.niveaux.map((n) => (n.id === 'n_rdc0' ? ok(definirToiture(n, 'deux_pans')) : n)),
    };
    const retire = {
      ...avecToit,
      niveaux: avecToit.niveaux.map((n) => (n.id === 'n_rdc0' ? { ...n, toiture: null } : n)),
    };
    expect(toituresSuivies(avecToit, retire)).toBe(retire);
  });

  it('murs déplacés sous un étage qui couvre tout, ou partie déjà découverte : rien ne change', () => {
    const s = ok(
      toitureAutomatique(
        ok(ajouterNiveau(base(), { type: 'etage', copierMurs: true }, ctx)),
        'deux_pans',
      ),
    );
    const bouge = (x: Scene, id = 'n_rdc0') => ({
      ...x,
      niveaux: x.niveaux.map((n) =>
        n.id === id ? { ...n, murs: n.murs.map((m) => ({ ...m })) } : n,
      ),
    });
    // Étage complet au-dessus : le rez-de-chaussée reste couvert, pas de toit ajouté.
    const r = bouge(s);
    expect(toituresSuivies(s, r)).toBe(r);
    // Toit du rez-de-chaussée retiré exprès en même temps que ses murs changent : il était
    // déjà découvert, on respecte le choix (le modèle vient de l'étage vide).
    const avant = {
      ...s,
      niveaux: s.niveaux.map((n) =>
        n.id === 'n_rdc0' ? ok(definirToiture(n, 'deux_pans')) : { ...n, murs: [] },
      ),
    };
    const apres = bouge({
      ...avant,
      niveaux: avant.niveaux.map((n) => (n.id === 'n_rdc0' ? { ...n, toiture: null } : n)),
    });
    expect(toituresSuivies(avant, apres)).toBe(apres);
  });
});
