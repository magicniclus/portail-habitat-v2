import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tarifEnCentimes } from '../generique';
import type { Referentiel } from '../estimer';
import type { TarifGenerique } from '../types';

const donnees = (f: string) =>
  JSON.parse(readFileSync(resolve(__dirname, '../../../../../docs/data', f), 'utf8'));

/** Référentiel des tests : les mêmes fichiers que le seed (docs/data). */
export function referentielDeTest(): Referentiel {
  const detailles = donnees('prestations-prix-detaillees.json');
  const catalogue = donnees('prestations-catalogue.json') as {
    prestations: { id: string; tva: number; tarif: TarifGenerique }[];
  };
  return {
    version: detailles.version,
    coefficients: detailles.coefficients,
    detailles: detailles.prestations,
    catalogue: Object.fromEntries(
      catalogue.prestations.map((p) => [p.id, tarifEnCentimes(p.tarif)]),
    ),
    tvaCatalogue: Object.fromEntries(catalogue.prestations.map((p) => [p.id, p.tva])),
  };
}
