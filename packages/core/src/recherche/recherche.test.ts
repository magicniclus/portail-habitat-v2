import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { creerMoteur, type DonneesRecherche } from './moteur';
import { distance, normaliser, raciner } from './texte';

const lire = (f: string) => JSON.parse(readFileSync(resolve(__dirname, f), 'utf8'));
const donnees = lire('../../../../docs/data/recherche-intentions.json') as DonneesRecherche & {
  intentions: DonneesRecherche['intentions'];
};
const moteur = creerMoteur(donnees);
const { cas, metiers, intentions } = lire('__tests__/recherche.cases.json') as {
  intentions: { id: string; m: string; p: string; pop: number }[];
  cas: {
    q: string;
    attendu: {
      ids: string[];
      scores: number[];
      segments: unknown[];
      correction: string | null;
      urgence: boolean;
      metiers: string[];
      associees: string[];
    };
  }[];
  metiers: { q: string; attendu: string[] }[];
};

describe('données de recherche', () => {
  it('docs/data/recherche-intentions.json correspond au script de la maquette (137 intentions, 60 métiers)', () => {
    expect(donnees.intentions).toHaveLength(137);
    expect(Object.keys(donnees.metiers)).toHaveLength(60);
    expect(donnees.intentions.map((i) => [i.id, i.metier, i.prestation, i.popularite])).toEqual(
      intentions.map((i) => [i.id, i.m, i.p, i.pop]),
    );
  });
});

describe('recherche : identique à la maquette', () => {
  it.each(cas.map((c) => [c.q, c] as const))('« %s »', (q, c) => {
    const r = moteur.rechercher(q);
    expect(r.resultats.map((x) => x.id)).toEqual(c.attendu.ids);
    expect(r.resultats.map((x) => x.score)).toEqual(c.attendu.scores);
    expect(r.resultats.map((x) => x.segments)).toEqual(c.attendu.segments);
    expect(r.correction).toBe(c.attendu.correction);
    expect(r.urgence).toBe(c.attendu.urgence);
    expect(r.metiers.map((m) => m.id)).toEqual(c.attendu.metiers);
    expect(r.associees.map((a) => a.id)).toEqual(c.attendu.associees);
  });
  it.each(metiers.map((c) => [c.q, c] as const))('métiers « %s »', (q, c) => {
    expect(moteur.rechercherMetiers(q).map((m) => m.id)).toEqual(c.attendu);
  });
});

describe('recherche : outils', () => {
  it('normalisation', () => {
    expect(normaliser("  L'Œil-de-Bœuf à RÉNOVER !")).toBe('l oeil de boeuf a renover');
    expect(normaliser(undefined)).toBe('');
  });
  it('racinisation légère', () => {
    expect(raciner('fenetres')).toBe('fenetre');
    expect(raciner('travaux')).toBe('traval');
    expect(raciner('sol')).toBe('sol');
  });
  it('distance de Damerau-Levenshtein bornée', () => {
    expect(distance('carlage', 'carrelage', 2)).toBe(2);
    expect(distance('italiene', 'italienne', 1)).toBe(1);
    expect(distance('ab', 'ba', 1)).toBe(1);
    expect(distance('abc', 'xyzabc', 1)).toBe(2);
    expect(distance('maison', 'bateau', 1)).toBe(2);
  });
  it('intentions d’un métier et populaires', () => {
    const plombier = moteur.intentionsDuMetier('plombier');
    expect(plombier.length).toBeGreaterThan(0);
    expect(moteur.populaires().length).toBeGreaterThan(0);
  });
});
