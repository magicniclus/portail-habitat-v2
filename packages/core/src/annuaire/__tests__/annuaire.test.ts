import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pertinence, resultatsAnnuaire, trierAnnuaire, type FicheAnnuaire, type Tri } from '..';

const { artisans, cas } = JSON.parse(
  readFileSync(resolve(__dirname, 'annuaire.cases.json'), 'utf8'),
) as {
  artisans: FicheAnnuaire[];
  cas: {
    etat: {
      q: string;
      metiers: string[];
      rayon: number;
      note: number;
      labels: string[];
      dispo: 'tous' | 'semaine' | 'quinze';
      budget: 'tous' | FicheAnnuaire['budgetCle'];
      tri: Tri;
    };
    attendu: string[];
  }[];
};

const filtres = (e: (typeof cas)[number]['etat']) => ({
  q: e.q,
  metiers: e.metiers,
  rayonKm: e.rayon,
  noteMin: e.note,
  labels: e.labels,
  dispo: e.dispo,
  budget: e.budget,
});

describe('filtres et tri (maquette Annuaire Artisans)', () => {
  it('au moins 30 cas', () => expect(cas.length).toBeGreaterThanOrEqual(30));
  it.each(cas.map((c, i) => [i, c] as const))('cas %i', (_, c) => {
    const r = resultatsAnnuaire(artisans, filtres(c.etat), c.etat.tri);
    const attendu = c.attendu.map((id) => artisans.find((a) => a.id === id)!);
    expect(r.premium.map((a) => a.id)).toEqual(attendu.filter((a) => a.premium).map((a) => a.id));
    expect(r.standards.map((a) => a.id)).toEqual(
      attendu.filter((a) => !a.premium).map((a) => a.id),
    );
  });
});

describe('règles', () => {
  const a = (x: Partial<FicheAnnuaire> & { id: string }): FicheAnnuaire => ({
    nom: x.id,
    metiers: ['Plomberie'],
    pitch: '',
    tags: [],
    km: 5,
    note: 4.5,
    avis: 10,
    premium: false,
    labels: [],
    delaiJ: 7,
    budgetCle: 'moyen',
    ...x,
  });
  it('pertinence = note × 12 + avis × 0,4 − km × 0,6', () => {
    expect(pertinence({ note: 4.9, avis: 37, km: 4 })).toBeCloseTo(
      4.9 * 12 + 37 * 0.4 - 4 * 0.6,
      10,
    );
  });
  it('Premium toujours en tête, même mal classé', () => {
    const liste = [
      a({ id: 'top', note: 5, avis: 200 }),
      a({ id: 'prem', premium: true, note: 3, km: 50 }),
    ];
    const r = resultatsAnnuaire(liste, { rayonKm: 60 }, 'pertinence');
    expect(r.premium.map((x) => x.id)).toEqual(['prem']);
    expect(r.standards.map((x) => x.id)).toEqual(['top']);
  });
  it('tri stable à égalité', () => {
    const liste = [a({ id: 'b' }), a({ id: 'a' }), a({ id: 'c' })];
    expect(trierAnnuaire(liste, 'note').map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });
  it('filtres absents : seul le rayon s’applique', () => {
    const liste = [a({ id: 'pres', km: 3 }), a({ id: 'loin', km: 30 })];
    expect(
      resultatsAnnuaire(liste, { rayonKm: 20 }, 'proximite').standards.map((x) => x.id),
    ).toEqual(['pres']);
  });
});
