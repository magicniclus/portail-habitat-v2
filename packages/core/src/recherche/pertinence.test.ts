import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { creerMoteur, type DonneesRecherche } from './moteur';

const lire = (f: string) => JSON.parse(readFileSync(resolve(__dirname, f), 'utf8'));
const donnees = lire('../../../../docs/data/recherche-intentions.json') as DonneesRecherche;
const moteur = creerMoteur(donnees);
const { cas } = lire('__tests__/pertinence.cases.json') as {
  cas: { q: string; attendu: string | null; urgence?: boolean }[];
};

const premier = (q: string) => moteur.rechercher(q).resultats[0]?.id ?? null;
const top3 = (q: string) =>
  moteur
    .rechercher(q)
    .resultats.slice(0, 3)
    .map((r) => r.id);

describe('pertinence (RECHERCHE.md §6)', () => {
  it('au moins 200 requêtes étiquetées', () => {
    expect(cas.length).toBeGreaterThanOrEqual(200);
  });
  it('≥ 95 % au 1er rang', () => {
    const ok = cas.filter((c) => premier(c.q) === c.attendu).length;
    expect(ok / cas.length).toBeGreaterThanOrEqual(0.95);
  });
  it('100 % dans le top 3', () => {
    const rates = cas
      .filter((c) => c.attendu !== null && !top3(c.q).includes(c.attendu))
      .map((c) => c.q);
    expect(rates).toEqual([]);
  });
});

describe('exemples obligatoires (RECHERCHE.md §6)', () => {
  it.each([
    ['renovation de salle de bain', 'sdb-renovation'],
    ['sdb', 'sdb-renovation'],
    ['douche italiene', 'sdb-italienne'],
    ['carlage', 'carrelage-sol'],
    ['refaire ma cuisine', 'cuisine-renovation'],
    ['pac', 'pac-air-eau'],
    ['remplacer chaudiere fioul par pompe a chaleur', 'pac-air-eau'],
    ['chaudier', 'chaudiere'],
    ['toit qui fuit urgent', 'toiture-fuite'],
    ['wc bouché', 'plomberie-debouchage'],
    ['ipn', 'mur-porteur'],
    ['volet roulant bloqué', 'volets'],
    ['isolation combles perdus', 'isolation-combles'],
    ['mettre une borne de recharge', 'borne-recharge'],
    ['peindre mon salon', 'peinture-interieure'],
    ['fosse septique', 'assainissement'],
  ])('« %s » → %s', (q, attendu) => {
    expect(premier(q)).toBe(attendu);
  });
  it('« toit qui fuit urgent » détecte l’urgence', () => {
    expect(moteur.rechercher('toit qui fuit urgent').urgence).toBe(true);
  });
  it('« xyzabc » : aucun résultat', () => {
    expect(moteur.rechercher('xyzabc').resultats).toEqual([]);
  });
});
