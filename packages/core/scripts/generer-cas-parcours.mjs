// Produit src/parcours/__tests__/parcours.cases.json à partir de la maquette Simulateur de Devis :
// champs des 112 prestations, valeurs par défaut, migration des réponses et résumé de l'encart de reprise.
// Usage : node scripts/generer-cas-parcours.mjs
import { writeFileSync } from 'node:fs';
import { aleatoire, chargerMaquette } from './maquette.mjs';

const m = chargerMaquette('Simulateur de Devis.dc.html', {
  avant: ['prestations-catalogue.js'],
  jusqua: null,
  globaux: { DCLogic: class {} },
  exporter: ['PRESTATIONS', 'chargerCatalogue', 'Component'],
});
m.chargerCatalogue();
const composant = new m.Component();

const hasard = aleatoire(20260928);
const choisir = (l) => l[Math.floor(hasard() * l.length)];

/** Réponses enregistrées, en partie abîmées comme après un changement de référentiel ou une édition à la main. */
function reponses(p, taux) {
  const v = {};
  for (const c of p.champs) {
    const abime = hasard() < taux;
    if (c.kind === 'slider' || c.kind === 'stepper') {
      const pas = c.pas || 1;
      const ok = c.min + Math.floor(hasard() * (Math.round((c.max - c.min) / pas) + 1)) * pas;
      v[c.id] = abime ? choisir([c.max + pas, c.min - pas, String(ok), undefined]) : ok;
    } else if (c.kind === 'options') {
      v[c.id] = abime ? choisir(['disparu', 0, [], undefined]) : choisir(c.options).v;
    } else {
      const ok = c.options.filter(() => hasard() < 0.5).map((o) => o.v);
      v[c.id] = abime ? choisir([[...ok, 'disparu'], 'texte', undefined]) : ok;
    }
    if (v[c.id] === undefined) delete v[c.id];
  }
  if (hasard() < 0.3) v.champSupprime = 'x';
  return v;
}

const cas = [];
for (const [i, p] of m.PRESTATIONS.entries()) {
  const essais = i < 9 ? 6 : 2;
  for (let k = 0; k < essais; k++) {
    const rep = reponses(p, k === 0 ? 0 : 0.35);
    const mig = composant.migrer(p, rep);
    const cles = p.champs
      .filter((c) => c.e === 2)
      .slice(0, 2)
      .map((c) => composant.lisible(c, mig.v[c.id]))
      .filter(Boolean);
    cas.push({
      prestationId: p.id,
      reponses: rep,
      attendu: {
        reponses: mig.v,
        nbRetirees: mig.retirees,
        resume: [p.nom, ...cles].join(' · '),
      },
    });
  }
}

const champs = Object.fromEntries(
  m.PRESTATIONS.map((p) => [
    p.id,
    {
      nom: p.nom,
      defaut: composant.valeursParDefaut(p),
      // Les coefficients de prix (k) ne font pas partie des champs publics.
      champs: JSON.parse(JSON.stringify(p.champs, (cle, val) => (cle === 'k' ? undefined : val))),
    },
  ]),
);

writeFileSync(
  new URL('../src/parcours/__tests__/parcours.cases.json', import.meta.url),
  `${JSON.stringify({ _source: 'Simulateur de Devis.dc.html (migrer, valeursParDefaut, lisible)', champs, cas }, null, 1)}\n`,
);
console.log(`${cas.length} cas, ${Object.keys(champs).length} prestations`);
