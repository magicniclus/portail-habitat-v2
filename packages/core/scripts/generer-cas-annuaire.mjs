// Produit src/annuaire/__tests__/annuaire.cases.json en exécutant filtrer() et trier() de la maquette Annuaire Artisans.
// Usage : node scripts/generer-cas-annuaire.mjs
import { writeFileSync } from 'node:fs';
import { aleatoire, chargerMaquette } from './maquette.mjs';

const m = chargerMaquette('Annuaire Artisans.dc.html', {
  jusqua: null,
  globaux: { DCLogic: class {} },
  exporter: ['ARTISANS', 'METIERS', 'Component'],
});
const hasard = aleatoire(20261001);
const choisir = (l) => l[Math.floor(hasard() * l.length)];
const LABELS = [
  'decennale',
  'qualibat',
  'rapide',
  'photos',
  'rge',
  'devis48',
  'recommande',
  'local',
];

// Les 10 artisans de la maquette + 30 fiches générées (égalités de note, d'avis et de distance incluses).
const artisans = m.ARTISANS.map((a) => ({ ...a }));
for (let i = 0; i < 30; i++) {
  artisans.push({
    id: `g${i}`,
    nom: `Entreprise ${i}`,
    metiers: [choisir(m.METIERS), ...(hasard() < 0.3 ? [choisir(m.METIERS)] : [])],
    pitch: choisir(['Dépannage rapide', 'Rénovation complète', 'Travaux soignés']),
    tags: [choisir(['fuite', 'toiture', 'peinture', 'carrelage'])],
    km: Math.floor(hasard() * 60),
    note: choisir([3.8, 4, 4.2, 4.5, 4.5, 4.8, 5]),
    avis: choisir([0, 5, 12, 30, 30, 80]),
    premium: hasard() < 0.2,
    labels: LABELS.filter(() => hasard() < 0.3),
    delaiJ: choisir([1, 5, 7, 8, 15, 16, 30]),
    budgetCle: choisir(['petit', 'moyen', 'grand']),
  });
}
m.ARTISANS.splice(0, m.ARTISANS.length, ...artisans);

const c = new m.Component();
const cas = [];
for (let i = 0; i < 150; i++) {
  const etat = {
    q: choisir(['', '', '', '', '', '', 'plomberie', 'toiture', 'dépannage', 'Rénovation', 'zzz']),
    metiers: hasard() < 0.25 ? [choisir(m.METIERS)] : [],
    rayon: choisir([10, 20, 30, 60, 60]),
    note: choisir([0, 0, 4, 4.5, 4.8]),
    labels: hasard() < 0.1 ? [choisir(LABELS)] : [],
    dispo: choisir(['tous', 'tous', 'semaine', 'quinze']),
    budget: choisir(['tous', 'tous', 'petit', 'moyen', 'grand']),
    tri: choisir(['pertinence', 'note', 'proximite', 'delai', 'avis']),
  };
  c.state = { ...c.state, ...etat };
  const r = c.trier(c.filtrer());
  cas.push({ etat, attendu: r.map((a) => a.id) });
}
writeFileSync(
  new URL('../src/annuaire/__tests__/annuaire.cases.json', import.meta.url),
  `${JSON.stringify({ _source: 'Annuaire Artisans.dc.html (filtrer, trier)', artisans, cas }, null, 1)}\n`,
);
console.log(
  `${cas.length} cas, ${cas.filter((x) => x.attendu.length > 1).length} avec au moins 2 résultats`,
);
