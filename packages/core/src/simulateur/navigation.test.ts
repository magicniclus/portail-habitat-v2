import { describe, expect, it } from 'vitest';
import { champSansMontant, type Champ } from './champs';
import { etapeDepuisUrl, etapePrecedente, etapeSuivante, filtrerPrestations } from './navigation';

const c = (id: string, e: number): Champ => ({
  id,
  kind: 'options',
  label: id,
  aide: '',
  options: [{ v: 'a', label: 'A' }],
  e,
});
const avecOptions = [c('a', 2), c('b', 3)];
const sansOptions = [c('a', 2)];

describe('navigation du simulateur', () => {
  it('étape suivante : l’étape 3 est sautée sans champ d’options', () => {
    expect(etapeSuivante(2, avecOptions)).toBe(3);
    expect(etapeSuivante(2, sansOptions)).toBe(4);
    expect(etapeSuivante(4, sansOptions)).toBe(5);
    expect(etapeSuivante(5, sansOptions)).toBe(5);
  });
  it('étape précédente : symétrique, jamais sous 1', () => {
    expect(etapePrecedente(4, sansOptions)).toBe(2);
    expect(etapePrecedente(4, avecOptions)).toBe(3);
    expect(etapePrecedente(1, avecOptions)).toBe(1);
  });
  it('étape lue dans l’URL : bornée, 1 sans prestation, 3 corrigée si vide', () => {
    expect(etapeDepuisUrl('3', avecOptions)).toBe(3);
    expect(etapeDepuisUrl('3', sansOptions)).toBe(2);
    expect(etapeDepuisUrl('9', avecOptions)).toBe(5);
    expect(etapeDepuisUrl('x', avecOptions)).toBe(2);
    expect(etapeDepuisUrl(null, avecOptions)).toBe(2);
    expect(etapeDepuisUrl('4', null)).toBe(1);
  });
});

describe('champSansMontant', () => {
  it('retire les descriptions qui citent un montant en euros, garde les autres', () => {
    const champ: Champ = {
      id: 'isolant',
      kind: 'options',
      label: 'Isolant',
      aide: '',
      e: 2,
      options: [
        { v: 'a', label: 'Soufflage', desc: '25-45 €/m²' },
        { v: 'b', label: 'Rouleaux', desc: 'Le plus courant, +8 %' },
        { v: 'c', label: 'Panneaux', desc: '+ 1 400 à 2 400 €' },
      ],
    };
    expect(champSansMontant(champ)).toMatchObject({
      options: [
        { v: 'a', label: 'Soufflage' },
        { v: 'b', label: 'Rouleaux', desc: 'Le plus courant, +8 %' },
        { v: 'c', label: 'Panneaux' },
      ],
    });
    expect(JSON.stringify(champSansMontant(champ))).not.toContain('€');
  });
});

describe('filtrerPrestations', () => {
  const liste = [
    { id: 'peinture', nom: 'Peinture', pitch: 'Murs, plafonds', famille: 'deco' },
    { id: 'sdb', nom: 'Salle de bain', pitch: 'Rénovation complète', famille: 'sdb-cuisine' },
    { id: 'sdb-douche', nom: 'Douche à l’italienne', pitch: 'Receveur', famille: 'sdb-cuisine' },
  ];
  it('sans recherche : famille seulement', () => {
    expect(filtrerPrestations(liste, '', [], 'toutes').map((p) => p.id)).toEqual([
      'peinture',
      'sdb',
      'sdb-douche',
    ]);
    expect(filtrerPrestations(liste, '', [], 'deco').map((p) => p.id)).toEqual(['peinture']);
  });
  it('avec recherche : résultats du moteur d’abord, puis texte sans accents', () => {
    expect(
      filtrerPrestations(liste, 'douche', ['sdb-douche', 'sdb'], 'toutes').map((p) => p.id),
    ).toEqual(['sdb-douche', 'sdb']);
    expect(filtrerPrestations(liste, 'plafond', [], 'toutes').map((p) => p.id)).toEqual([
      'peinture',
    ]);
    expect(filtrerPrestations(liste, 'renovation', [], 'toutes').map((p) => p.id)).toEqual(['sdb']);
  });
  it('une seule lettre : pas de filtre de texte', () => {
    expect(filtrerPrestations(liste, 'p', [], 'toutes')).toHaveLength(3);
  });
});
