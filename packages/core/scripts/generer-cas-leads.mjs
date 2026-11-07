// Produit src/leads/__tests__/leads.cases.json : implémentation de référence, écrite indépendamment
// du code de production, directement depuis la formule de DATABASE.md §5 et les compléments de D47.
// Usage : node scripts/generer-cas-leads.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { aleatoire } from './maquette.mjs';

const { bareme: B } = JSON.parse(
  readFileSync(new URL('../../../docs/data/bareme-appels-offres.json', import.meta.url), 'utf8'),
);
const hasard = aleatoire(20260930);
const choisir = (l) => l[Math.floor(hasard() * l.length)];

function reference(l) {
  let base = B.prixBaseDefaut;
  if (l.famille in B.prixBaseParMetier) base = B.prixBaseParMetier[l.famille];
  if (l.metier in B.prixBaseParMetier) base = B.prixBaseParMetier[l.metier];
  const q = l.qualiteLead >= 80 ? 1.2 : l.qualiteLead >= 50 ? 1 : 0.7;
  const c = l.nbEligibles <= 2 ? 0.9 : l.nbEligibles >= 8 ? 1.15 : 1;
  let prix = Math.round(base * B.coefBudget[l.trancheBudget] * B.coefUrgence[l.urgence] * q * c);
  prix = Math.min(9900, Math.max(500, prix));
  prix = Math.round(prix / 100) * 100;
  return {
    prixBaseCentimes: prix,
    prixPremiumCentimes: Math.round(Math.round(prix * 0.7) / 100) * 100,
    prixCredits: Math.ceil(prix / 1000),
  };
}

const METIERS = [
  ['plombier', 'plomberie'],
  ['couvreur', 'toiture'],
  ['renovation', 'interieur'],
  ['diag', 'traitements'],
  ['peintre', 'deco'],
  ['macon', 'gros-oeuvre'],
  ['inconnu', 'famille-inconnue'],
  ['electricien', 'electricite'],
  ['multiservice', 'depannage'],
  ['cuisiniste', 'sdb-cuisine'],
];
const cas = [];
for (let i = 0; i < 120; i++) {
  const [metier, famille] = choisir(METIERS);
  const l = {
    metier,
    famille,
    trancheBudget: choisir(['S', 'M', 'L', 'XL']),
    urgence: choisir(['normale', 'rapide', 'urgente']),
    qualiteLead: choisir([0, 29, 49, 50, 51, 79, 80, 100, Math.floor(hasard() * 101)]),
    nbEligibles: choisir([0, 1, 2, 3, 5, 7, 8, 20]),
  };
  cas.push({ entree: l, attendu: reference(l) });
}
writeFileSync(
  new URL('../src/leads/__tests__/leads.cases.json', import.meta.url),
  `${JSON.stringify({ _source: 'DATABASE.md §5 + D47, implémentation de référence indépendante', cas }, null, 1)}\n`,
);
console.log(`${cas.length} cas`);
