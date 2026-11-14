// Vérifie la cohérence de docs/data : chaque intention pointe vers une prestation existante,
// chaque métier a une prestation par défaut, chaque prestation a une famille valide.
// Usage : pnpm verifier:referentiel (sortie non nulle en cas d'erreur)
import { readFileSync } from 'node:fs';
import { depuisFichiers, verifierReferentiel } from '../src/referentiel/verifier.ts';

const lire = (f: string) =>
  JSON.parse(readFileSync(new URL(`../../../docs/data/${f}`, import.meta.url), 'utf8'));
const donnees = depuisFichiers(
  lire('prestations-catalogue.json'),
  lire('prestations.json'),
  lire('recherche-intentions.json'),
);
const erreurs = verifierReferentiel(donnees);
if (erreurs.length) {
  console.error(
    `${erreurs.length} incohérence(s) dans le référentiel :\n- ${erreurs.join('\n- ')}`,
  );
  process.exit(1);
}
console.log(
  `Référentiel cohérent : ${donnees.prestations.length} prestations, ${donnees.familles.length} familles, ` +
    `${Object.keys(donnees.metiers).length} métiers, ${donnees.intentions.length} intentions.`,
);
