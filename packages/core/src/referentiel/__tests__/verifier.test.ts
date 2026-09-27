import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { depuisFichiers, verifierReferentiel, type DonneesReferentiel } from '../verifier';

const lire = (f: string) =>
  JSON.parse(readFileSync(resolve(__dirname, '../../../../../docs/data', f), 'utf8'));
const reel = depuisFichiers(
  lire('prestations-catalogue.json'),
  lire('prestations.json'),
  lire('recherche-intentions.json'),
);

describe('référentiel de docs/data', () => {
  it('cohérent : 112 prestations, 15 familles, 60 métiers, 137 intentions', () => {
    expect(verifierReferentiel(reel)).toEqual([]);
    expect(reel.prestations).toHaveLength(112);
    expect(reel.familles).toHaveLength(15);
    expect(Object.keys(reel.metiers)).toHaveLength(60);
    expect(reel.intentions).toHaveLength(137);
  });
});

describe('détection des incohérences', () => {
  const base: DonneesReferentiel = {
    familles: [{ id: 'plomberie' }, { id: 'deco' }],
    prestations: [
      { id: 'plomberie', famille: 'plomberie' },
      { id: 'peinture', famille: 'deco' },
    ],
    metiers: {
      plombier: { id: 'plombier', famille: 'plomberie', prestation: 'plomberie' },
      peintre: { id: 'peintre', famille: 'deco', prestation: 'peinture' },
    },
    intentions: [{ id: 'fuite', metier: 'plombier', prestation: 'plomberie' }],
  };
  it('jeu minimal valide', () => expect(verifierReferentiel(base)).toEqual([]));
  it.each<[string, (d: DonneesReferentiel) => DonneesReferentiel, string]>([
    [
      'prestation en double',
      (d) => ({ ...d, prestations: [...d.prestations, d.prestations[0]!] }),
      'Prestation en double : plomberie',
    ],
    [
      'famille de prestation inconnue',
      (d) => ({ ...d, prestations: [...d.prestations, { id: 'x', famille: 'zz' }] }),
      'Prestation x : famille inconnue « zz »',
    ],
    [
      'famille sans prestation',
      (d) => ({ ...d, familles: [...d.familles, { id: 'toiture' }] }),
      'Famille toiture : aucune prestation estimable',
    ],
    [
      'métier sans prestation par défaut',
      (d) => ({ ...d, metiers: { ...d.metiers, macon: { id: 'macon', famille: 'deco' } } }),
      'Métier macon : aucune prestation par défaut',
    ],
    [
      'prestation par défaut inconnue',
      (d) => ({
        ...d,
        metiers: { ...d.metiers, macon: { id: 'macon', famille: 'deco', prestation: 'zz' } },
      }),
      'Métier macon : prestation par défaut inconnue « zz »',
    ],
    [
      'famille de métier inconnue',
      (d) => ({
        ...d,
        metiers: { ...d.metiers, macon: { id: 'macon', famille: 'zz', prestation: 'peinture' } },
      }),
      'Métier macon : famille inconnue « zz »',
    ],
    [
      'clé de métier incohérente',
      (d) => ({
        ...d,
        metiers: { ...d.metiers, macon: { id: 'maçon', famille: 'deco', prestation: 'peinture' } },
      }),
      'Métier macon : identifiant incohérent « maçon »',
    ],
    [
      'intention vers une prestation inconnue',
      (d) => ({ ...d, intentions: [{ id: 'i', metier: 'plombier', prestation: 'zz' }] }),
      'Intention i : prestation inconnue « zz »',
    ],
    [
      'intention vers un métier inconnu',
      (d) => ({ ...d, intentions: [{ id: 'i', metier: 'zz', prestation: 'plomberie' }] }),
      'Intention i : métier inconnu « zz »',
    ],
    [
      'intention en double',
      (d) => ({ ...d, intentions: [...d.intentions, d.intentions[0]!] }),
      'Intention en double : fuite',
    ],
  ])('%s', (_, casser, message) => {
    expect(verifierReferentiel(casser(base))).toContain(message);
  });
  it('prestation détaillée sans famille connue', () => {
    const d = depuisFichiers(
      { familles: [{ id: 'deco' }], familleDesPrestationsDetaillees: {}, prestations: [] },
      { prestations: [{ id: 'peinture' }] },
      { metiers: {}, intentions: [] },
    );
    expect(verifierReferentiel(d)).toContain('Prestation peinture : famille inconnue «  »');
  });
});
