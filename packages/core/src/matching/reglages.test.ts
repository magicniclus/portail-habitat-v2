import { describe, expect, it } from 'vitest';
import { CONFIG_MATCHING_DEFAUT } from './config';
import {
  configDepuisDocument,
  configDepuisSaisie,
  documentDepuisConfig,
  saisieDepuisConfig,
} from './reglages';

describe('réglages de l’algorithme (ADMIN §2.10)', () => {
  it('document Firestore ↔ configuration, sans perte', () => {
    const doc = documentDepuisConfig(CONFIG_MATCHING_DEFAUT);
    expect(configDepuisDocument(doc, CONFIG_MATCHING_DEFAUT)).toEqual(CONFIG_MATCHING_DEFAUT);
  });
  it('document partiel : valeurs par défaut pour le reste', () => {
    const c = configDepuisDocument(
      { version: 9, poids: { distance: 0.3 }, seuils: { scoreMin: 40 } },
      CONFIG_MATCHING_DEFAUT,
    );
    expect(c).toMatchObject({ version: 9, scoreMin: 40, nbCibles: 3 });
    expect(c.poids.distance).toBe(0.3);
    expect(c.poids.competence).toBe(0.25);
  });
  it('saisie en pourcentages ↔ configuration', () => {
    const s = saisieDepuisConfig(CONFIG_MATCHING_DEFAUT);
    expect(s.poids.competence).toBe(25);
    expect(configDepuisSaisie(s, CONFIG_MATCHING_DEFAUT)).toEqual(CONFIG_MATCHING_DEFAUT);
  });
});
