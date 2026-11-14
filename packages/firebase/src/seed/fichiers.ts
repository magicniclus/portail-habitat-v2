import { readFileSync } from 'node:fs';
import type { Bareme } from '@ph/core/leads';
import type { FichiersSeed } from './referentiel';

/** Lit les fichiers de docs/data utilisés par le seed. */
export function lireFichiersSeed(dossier: URL): FichiersSeed & { bareme: { bareme: Bareme } } {
  const lire = (f: string) => JSON.parse(readFileSync(new URL(f, dossier), 'utf8'));
  return {
    prestations: lire('prestations.json'),
    catalogue: lire('prestations-catalogue.json'),
    prixDetailles: lire('prestations-prix-detaillees.json'),
    recherche: lire('recherche-intentions.json'),
    communes: lire('communes.json'),
    annuaire: lire('annuaire-demo.json'),
    demandes: lire('demandes-demo.json'),
    bareme: lire('bareme-appels-offres.json'),
  };
}
