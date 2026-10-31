import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  demandesAffichees,
  departementDuCodePostal,
  estimerDemandes,
  partMetier,
  type EntreeDemandes,
  type ModeleDemandes,
  type ReferentielMetiers,
} from '..';

const lire = (f: string) => JSON.parse(readFileSync(resolve(__dirname, f), 'utf8'));
const { modele, population } = lire('../../../../../docs/data/stats-demandes.json') as {
  modele: ModeleDemandes;
  population: Record<string, number>;
};
const referentiel = lire(
  '../../../../../docs/data/recherche-intentions.json',
) as ReferentielMetiers;
const { cas } = lire('stats.cases.json') as {
  cas: { entree: EntreeDemandes; attendu: Record<string, unknown> }[];
};

const estimer = (e: EntreeDemandes) => estimerDemandes(e, modele, population, referentiel);

describe('modèle (portage de PH_DEMANDES.estimer)', () => {
  it('au moins 30 cas', () => expect(cas.length).toBeGreaterThanOrEqual(30));
  it.each(cas.map((c, i) => [i, c] as const))('cas %i', (_, c) => {
    const r = estimer(c.entree);
    expect({ total: r.total, parMetier: r.parMetier, departement: r.departement }).toEqual(
      c.attendu,
    );
    expect(r.source).toBe('modele');
  });
});

describe('propriétés (STATS_DEMANDES §5)', () => {
  const e: EntreeDemandes = { codePostal: '33000', metiers: ['couvreur'], rayonKm: 30, mois: 9 };
  it('même entrée, même résultat (page d’acquisition et étape 2 de l’inscription)', () => {
    expect(estimer(e)).toEqual(estimer({ ...e, metiers: [...e.metiers] }));
  });
  it('somme des parts de famille = 1', () => {
    const s = Object.values(modele.familles).reduce((a, x) => a + x, 0);
    expect(s).toBeCloseTo(1, 10);
  });
  it('parts des métiers d’une famille = part de la famille', () => {
    const couvreurs = Object.entries(referentiel.metiers)
      .filter(([, m]) => m.famille === 'toiture')
      .reduce((a, [id]) => a + partMetier(id, modele, referentiel), 0);
    expect(couvreurs).toBeCloseTo(modele.familles.toiture!, 10);
  });
  it('minimum respecté pour un petit métier', () => {
    const r = estimer({
      codePostal: '48000',
      metiers: Object.keys(referentiel.metiers),
      rayonKm: 30,
      mois: 8,
    });
    expect(Math.min(...Object.values(r.parMetier))).toBe(modele.minimum);
  });
  it('plusieurs métiers : somme des parts', () => {
    const r = estimer({ ...e, metiers: ['couvreur', 'plombier'] });
    expect(r.total).toBe(r.parMetier.couvreur! + r.parMetier.plombier!);
  });
  it('code postal inconnu : pas de chiffre', () => {
    expect(estimer({ ...e, codePostal: '99000' }).total).toBeNull();
  });
  it('métier inconnu : part 1', () => {
    expect(partMetier('inconnu', modele, referentiel)).toBe(1);
  });
});

describe('département', () => {
  it.each([
    ['33000', '33'],
    ['20000', '2A'],
    ['20200', '2B'],
    ['97400', '974'],
    ['01 000', '01'],
    ['3', null],
  ])('%s → %s', (cp, d) => expect(departementDuCodePostal(cp)).toBe(d));
});

describe('bascule vers le réel (§1)', () => {
  const m = estimer({
    codePostal: '33000',
    metiers: ['couvreur', 'plombier'],
    rayonKm: 30,
    mois: 9,
  });
  const reel = { parMetier: { couvreur: 12, plombier: 40, macon: 5 } };
  it('moins de 3 mois d’historique : modèle', () => {
    expect(demandesAffichees(m, { ...reel, moisHistorique: 2 })).toBe(m);
    expect(demandesAffichees(m, null)).toBe(m);
  });
  it('3 mois d’historique : décompte réel, libellé « déposées »', () => {
    expect(demandesAffichees(m, { ...reel, moisHistorique: 3 })).toEqual({
      total: 52,
      parMetier: { couvreur: 12, plombier: 40 },
      departement: '33',
      source: 'reel',
    });
  });
  it('métier sans demande réelle : 0', () => {
    const r = demandesAffichees(
      estimer({ codePostal: '33000', metiers: ['serrurier'], rayonKm: 30, mois: 9 }),
      { ...reel, moisHistorique: 6 },
    );
    expect(r.parMetier).toEqual({ serrurier: 0 });
  });
  it('tous métiers : somme du réel', () => {
    const tous = estimer({ codePostal: '33000', metiers: [], rayonKm: 30, mois: 9 });
    expect(demandesAffichees(tous, { ...reel, moisHistorique: 4 }).total).toBe(57);
  });
  it('département inconnu : pas de réel', () => {
    const inconnu = estimer({ codePostal: '99000', metiers: [], rayonKm: 30, mois: 9 });
    expect(demandesAffichees(inconnu, { ...reel, moisHistorique: 4 })).toBe(inconnu);
  });
});
