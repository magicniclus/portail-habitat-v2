import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tarifEnCentimes } from './generique';
import { tarifDepuisDocument, tarifVersDocument } from './stockage';
import type { TarifGenerique } from './types';

const catalogue = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../docs/data/prestations-catalogue.json'), 'utf8'),
) as { prestations: { id: string; tarif: TarifGenerique }[] };

describe('tarif en document Firestore', () => {
  it.each(catalogue.prestations.map((p) => [p.id, tarifEnCentimes(p.tarif)] as const))(
    '%s : aller-retour sans perte, aucun tableau imbriqué',
    (_, t) => {
      const doc = tarifVersDocument(t);
      const imbrique = (x: unknown): boolean =>
        Array.isArray(x)
          ? x.some((y) => Array.isArray(y) || imbrique(y))
          : typeof x === 'object' && x !== null && Object.values(x).some(imbrique);
      expect(imbrique(doc)).toBe(false);
      const { lib, unitaire, base, evac, choix, extras } = t;
      expect(tarifDepuisDocument(doc)).toEqual({ lib, unitaire, base, evac, choix, extras });
    },
  );
});
