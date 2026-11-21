import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Referentiel } from '../estimer';
import { referentielDepuisFichiers } from '../referentiel';

const donnees = (f: string) =>
  JSON.parse(readFileSync(resolve(__dirname, '../../../../../docs/data', f), 'utf8'));

/** Référentiel des tests : les mêmes fichiers que le seed (docs/data). */
export function referentielDeTest(): Referentiel {
  return referentielDepuisFichiers(
    donnees('prestations-prix-detaillees.json'),
    donnees('prestations-catalogue.json'),
  );
}
