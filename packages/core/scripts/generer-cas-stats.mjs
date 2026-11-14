// Produit src/stats/__tests__/stats.cases.json en exécutant PH_DEMANDES.estimer (designs/estimation-demandes.js).
// Usage : node scripts/generer-cas-stats.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { aleatoire } from './maquette.mjs';

const bac = { window: {}, console, Math, JSON, Date, Set, Map };
vm.createContext(bac);
for (const f of ['recherche-projets.js', 'estimation-demandes.js'])
  vm.runInContext(
    readFileSync(new URL(`../../../docs/designs/${f}`, import.meta.url), 'utf8'),
    bac,
  );
const { estimer } = bac.window.PH_DEMANDES;
const metiers = Object.keys(bac.window.PH_RECHERCHE.METIERS);

const hasard = aleatoire(20260929);
const choisir = (l) => l[Math.floor(hasard() * l.length)];
const CP = [
  '33000',
  '75011',
  '92100',
  '93200',
  '94000',
  '48000',
  '20000',
  '20200',
  '97400',
  '97100',
  '69003',
  '13008',
  '59000',
  '01000',
  '',
  '3',
  '99000',
  '976',
  '2A004',
  '31000',
];

const cas = [
  // exemples de STATS_DEMANDES §2 (septembre, 30 km)
  { codePostal: '33000', metiers: [], rayonKm: 30, mois: 9 },
  { codePostal: '33000', metiers: ['plombier'], rayonKm: 30, mois: 9 },
  { codePostal: '33000', metiers: ['couvreur'], rayonKm: 30, mois: 9 },
  { codePostal: '48000', metiers: ['plombier'], rayonKm: 30, mois: 9 },
];
for (let i = 0; i < 200; i++) {
  const n = Math.floor(hasard() * 4);
  const ms = [];
  for (let k = 0; k < n; k++) ms.push(hasard() < 0.05 ? 'inconnu' : choisir(metiers));
  cas.push({
    codePostal: choisir(CP),
    metiers: [...new Set(ms)],
    rayonKm: choisir([30, 50, 100, 30, 20, 75]),
    mois: 1 + Math.floor(hasard() * 12),
  });
}
const sortie = cas.map((e) => {
  const r = estimer({
    cp: e.codePostal,
    metiers: e.metiers,
    rayon: e.rayonKm,
    date: new Date(2026, e.mois - 1, 15),
  });
  return {
    entree: e,
    attendu: { total: r.total, parMetier: r.parMetier, departement: r.departement },
  };
});
writeFileSync(
  new URL('../src/stats/__tests__/stats.cases.json', import.meta.url),
  `${JSON.stringify({ _source: 'designs/estimation-demandes.js (PH_DEMANDES.estimer)', cas: sortie }, null, 1)}\n`,
);
console.log(`${sortie.length} cas`);
