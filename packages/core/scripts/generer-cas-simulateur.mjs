// Produit src/simulateur/__tests__/simulateur.cases.json à partir de la maquette Simulateur de Devis.
// Usage : node scripts/generer-cas-simulateur.mjs
import { writeFileSync } from 'node:fs';
import { aleatoire, chargerMaquette } from './maquette.mjs';

const m = chargerMaquette('Simulateur de Devis.dc.html', {
  avant: ['prestations-catalogue.js'],
  exporter: ['PRESTATIONS', 'calculer', 'coefRegion', 'chargerCatalogue'],
});
m.chargerCatalogue();

const hasard = aleatoire(20260927);
const choisir = (liste) => liste[Math.floor(hasard() * liste.length)];
const CODES_POSTAUX = [
  '33000',
  '33150',
  '75011',
  '92100',
  '13008',
  '69003',
  '31000',
  '24100',
  '',
  '9',
];
const ACCES = ['facile', 'etage', 'difficile'];

function valeurs(p, mode) {
  const v = {};
  for (const c of p.champs) {
    if (c.kind === 'slider' || c.kind === 'stepper') {
      const pas = c.pas || 1;
      const n = Math.round((c.max - c.min) / pas);
      v[c.id] =
        mode === 'defaut'
          ? c.def
          : mode === 'min'
            ? c.min
            : mode === 'max'
              ? c.max
              : c.min + Math.floor(hasard() * (n + 1)) * pas;
    } else if (c.kind === 'options') {
      v[c.id] =
        mode === 'defaut'
          ? c.options[0].v
          : mode === 'max'
            ? c.options[c.options.length - 1].v
            : choisir(c.options).v;
    } else {
      v[c.id] =
        mode === 'defaut' || mode === 'min'
          ? []
          : mode === 'max'
            ? c.options.map((o) => o.v)
            : c.options.filter(() => hasard() < 0.5).map((o) => o.v);
    }
  }
  return v;
}

const cas = [];
for (const p of m.PRESTATIONS) {
  for (const mode of ['defaut', 'min', 'max', 'hasard', 'hasard']) {
    const reponses = valeurs(p, mode);
    const codePostal = mode === 'defaut' ? '33000' : choisir(CODES_POSTAUX);
    const acces = mode === 'defaut' ? 'facile' : choisir(ACCES);
    if (p.id === 'isolation' && mode !== 'defaut') reponses.aides = choisir(['non', 'oui']);
    // Reproduction exacte du calcul de renderVals() (étape 5 : accès pris en compte).
    const postes = m.calculer(p, reponses);
    const coef =
      m.coefRegion(codePostal).c * ({ facile: 1, etage: 1.06, difficile: 1.12 }[acces] || 1);
    let min = 0;
    let max = 0;
    for (const x of postes) {
      min += x.min * coef;
      max += x.max * coef;
    }
    const aides =
      p.id === 'isolation' && reponses.aides === 'oui'
        ? Math.min(max * 0.4, reponses.surface * 22)
        : 0;
    cas.push({
      prestationId: p.id,
      reponses,
      codePostal,
      acces,
      attendu: {
        coefRegion: m.coefRegion(codePostal).c,
        postes: postes.map((x) => ({ label: x.label, min: x.min, max: x.max })),
        aides,
        totalMin: Math.max(0, min - aides),
        totalMax: Math.max(0, max - aides),
      },
    });
  }
}

writeFileSync(
  new URL('../src/simulateur/__tests__/simulateur.cases.json', import.meta.url),
  `${JSON.stringify({ _source: 'docs/designs/Simulateur de Devis.dc.html (calculer, coefRegion) — montants en euros de la maquette', cas }, null, 1)}\n`,
);
console.log(`${cas.length} cas pour ${m.PRESTATIONS.length} prestations`);
