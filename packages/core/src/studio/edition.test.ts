import { describe, expect, it } from 'vitest';
import {
  ajouterCalque,
  ajouterCapture,
  calque,
  calqueParDefaut,
  LIBELLES_CALQUE,
  TYPES_CALQUE,
  motsDepuisAlignement,
  aimanter,
  tempsMontage,
  couperPlan,
  deplacerCalque,
  deplacerPlan,
  modifierCalque,
  modifierPlanVideo,
  motsDepuisTexte,
  rognerPlan,
  supprimerCalque,
  supprimerPlan,
  verifierPlan,
  type PlanMontage,
} from './index';

const plan = (): PlanMontage => ({
  format: 'vertical',
  titre: 'T',
  plans: [
    {
      id: 'a',
      source: { debut: 0, fin: 6_000 },
      visuel: 'carton',
      carton: 'Stop',
      camera: 'cachee',
      calques: [
        { type: 'texte', texte: 'Un', style: 'titre', position: 'haut', debut: 0, fin: 2_000 },
        { type: 'texte', texte: 'Deux', style: 'titre', position: 'bas', debut: 1_000, fin: 5_000 },
      ],
    },
    {
      id: 'b',
      source: { debut: 6_000, fin: 12_000 },
      visuel: 'carton',
      carton: 'B',
      camera: 'cachee',
      calques: [],
    },
  ],
  captures: [],
  artisan: null,
  sousTitres: true,
  musique: false,
});
const ctx = { dureePriseMs: 20_000, camera: false, ecran: false };

describe('édition du plan de montage', () => {
  it('déplacer un plan', () => {
    expect(deplacerPlan(plan(), 0, 1).plans.map((x) => x.id)).toEqual(['b', 'a']);
    expect(deplacerPlan(plan(), 0, 5).plans.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('couper à la tête de lecture : deux plans, animations réparties', () => {
    const p = couperPlan(plan(), 0, 1_500);
    expect(p.plans).toHaveLength(3);
    const [a, a2] = p.plans;
    expect(a!.source).toEqual({ debut: 0, fin: 1_500 });
    expect(a2!.source).toEqual({ debut: 1_500, fin: 6_000 });
    expect(a!.calques.map((c) => [c.debut, c.fin])).toEqual([
      [0, 1_500],
      [1_000, 1_500],
    ]);
    expect(a2!.calques.map((c) => [c.debut, c.fin])).toEqual([
      [0, 500],
      [0, 3_500],
    ]);
    expect(new Set(p.plans.map((x) => x.id)).size).toBe(3);
    expect(verifierPlan(p, ctx)).toEqual([]);
    // Trop près d'un bord : rien ne change.
    expect(couperPlan(plan(), 0, 100).plans).toHaveLength(2);
  });

  it('rogner un plan dans la prise, animations recadrées', () => {
    const p = rognerPlan(plan(), 0, { debut: 2_000, fin: 4_500 }, ctx.dureePriseMs);
    expect(p.plans[0]!.source).toEqual({ debut: 2_000, fin: 4_500 });
    expect(p.plans[0]!.calques.map((c) => [c.debut, c.fin])).toEqual([[0, 2_500]]);
    expect(rognerPlan(plan(), 1, { fin: 99_000 }, ctx.dureePriseMs).plans[1]!.source.fin).toBe(
      20_000,
    );
    // Jamais plus court que le minimum.
    expect(rognerPlan(plan(), 0, { fin: 100 }, ctx.dureePriseMs).plans[0]!.source.fin).toBe(400);
  });

  it('supprimer : jamais le dernier plan', () => {
    expect(supprimerPlan(plan(), 0).plans.map((x) => x.id)).toEqual(['b']);
    expect(supprimerPlan(supprimerPlan(plan(), 0), 0).plans).toHaveLength(1);
  });

  it('ajouter, modifier, déplacer et supprimer une animation', () => {
    let p = ajouterCalque(plan(), 1, calqueParDefaut('compteur', 6_000));
    expect(p.plans[1]!.calques[0]).toMatchObject({ type: 'compteur', debut: 0 });
    p = modifierCalque(p, 1, 0, { libelle: 'demandes' });
    expect(p.plans[1]!.calques[0]).toMatchObject({ libelle: 'demandes' });
    p = deplacerCalque(p, 1, 0, 5_000);
    const c = p.plans[1]!.calques[0]!;
    expect(c.fin).toBe(6_000);
    expect(c.fin - c.debut).toBe(2_500);
    expect(verifierPlan(p, ctx)).toEqual([]);
    expect(supprimerCalque(p, 1, 0).plans[1]!.calques).toEqual([]);
    for (const t of [
      'texte',
      'compteur',
      'notification',
      'liste',
      'barre',
      'fleche',
      'surlignage',
    ] as const)
      expect(verifierPlan(ajouterCalque(plan(), 1, calqueParDefaut(t, 6_000)), ctx)).toEqual([]);
  });

  it('ajouter une capture Portail Travaux à un plan', () => {
    const p = ajouterCapture(plan(), 1, 'fiche_publique');
    expect(p.plans[1]).toMatchObject({ visuel: 'capture', captureId: 'c1' });
    expect(p.captures).toEqual([{ id: 'c1', scene: 'fiche_publique' }]);
    const q = ajouterCapture(p, 0, 'fiche_publique');
    expect(q.captures).toHaveLength(1);
    expect(q.plans[0]!.captureId).toBe('c1');
    expect(verifierPlan(q, ctx)).toEqual([]);
  });

  it('sous-titres sans voix : le texte du script réparti sur la durée', () => {
    const m = motsDepuisTexte('Bonjour les artisans. Gratuit !', 4_000);
    expect(m.map((x) => x.texte)).toEqual(['Bonjour', 'les', 'artisans.', 'Gratuit', '!']);
    expect(m[0]!.debut).toBe(0);
    expect(m.at(-1)!.fin).toBe(4_000);
    expect(m.every((x, i) => i === 0 || x.debut >= m[i - 1]!.fin)).toBe(true);
    expect(motsDepuisTexte('', 4_000)).toEqual([]);
  });

  it('voix de synthèse : les temps des lettres deviennent des mots', () => {
    const texte = 'Un  devis\nfacile';
    const debuts = [...texte].map((_, i) => i * 0.1);
    const fins = debuts.map((d) => d + 0.1);
    expect(motsDepuisAlignement([...texte], debuts, fins)).toEqual([
      { texte: 'Un', debut: 0, fin: 200 },
      { texte: 'devis', debut: 400, fin: 900 },
      { texte: 'facile', debut: 1000, fin: 1600 },
    ]);
    expect(motsDepuisAlignement([], [], [])).toEqual([]);
  });

  it('garde-fous : indices hors plan, plan trop court, temps manquants', () => {
    const p = plan();
    expect(deplacerPlan(p, 9, 0)).toBe(p);
    expect(couperPlan(p, 9, 1_000)).toBe(p);
    expect(rognerPlan(p, 9, { fin: 1 }, 20_000)).toBe(p);
    expect(supprimerPlan(p, 9)).toBe(p);
    expect(modifierPlanVideo(p, 9, { carton: 'x' })).toBe(p);
    expect(ajouterCalque(p, 9, calqueParDefaut('fleche', 1_000))).toBe(p);
    expect(modifierCalque(p, 0, 9, { debut: 0 })).toBe(p);
    expect(deplacerCalque(p, 9, 0, 0)).toBe(p);
    expect(supprimerCalque(p, 9, 0)).toBe(p);
    // Fin ramenée trop près du début : on garde la durée minimale, côté du bord tiré.
    const d0 = p.plans[0]!.source.debut;
    const f = rognerPlan(p, 0, { fin: d0 + 10 }, 20_000).plans[0]!.source;
    expect(f.fin - f.debut).toBe(400);
    const e = p.plans[0]!.source.fin;
    const g = rognerPlan(p, 0, { debut: e - 10 }, 20_000).plans[0]!.source;
    expect(g.fin - g.debut).toBe(400);
    expect(motsDepuisAlignement(['a', 'b', ' '], [], [])).toEqual([
      { texte: 'ab', debut: 0, fin: 0 },
    ]);
  });

  it('aimant : se cale sur le repère le plus proche sous le seuil', () => {
    expect(aimanter(1_030, [0, 1_000, 2_000], 50)).toBe(1_000);
    expect(aimanter(1_100, [0, 1_000, 2_000], 50)).toBe(1_100);
    expect(aimanter(1_960, [1_000, 2_000, 1_990], 50)).toBe(1_990);
    expect(aimanter(500, [], 50)).toBe(500);
  });

  it('temps affiché comme dans un logiciel de montage', () => {
    expect(tempsMontage(0)).toBe('00:00.00');
    expect(tempsMontage(4_250)).toBe('00:04.25');
    expect(tempsMontage(83_009)).toBe('01:23.00');
    expect(tempsMontage(-5)).toBe('00:00.00');
  });
});

describe('animations prêtes à poser', () => {
  it('chaque type a un réglage par défaut valide, borné par la durée du plan', () => {
    for (const type of TYPES_CALQUE) {
      const c = calqueParDefaut(type, 10_000);
      expect(calque.safeParse(c).success).toBe(true);
      expect(calqueParDefaut(type, 50).fin).toBe(100);
    }
    expect(calqueParDefaut('demandes', 10_000).fin).toBe(4_000);
    expect(LIBELLES_CALQUE.fin).toBe('Fin avec logo');
  });
});
