// Produit src/matching/__tests__/matching.cases.json : paires artisan / demande tirées au hasard et résultat
// attendu (raison d'exclusion ou score), calculé par une implémentation de référence écrite indépendamment
// du code de production, directement depuis les tableaux de MATCHING.md §3 [2] à [4].
// Usage : node scripts/generer-cas-matching.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { aleatoire } from './maquette.mjs';

const { config: C } = JSON.parse(
  readFileSync(new URL('../../../docs/data/matching-config.json', import.meta.url), 'utf8'),
);
const h = aleatoire(20261002);
const choisir = (l) => l[Math.floor(h() * l.length)];
const JOUR = 86_400_000;
const T0 = Date.UTC(2026, 9, 1);
const BORDEAUX = { latitude: 44.8378, longitude: -0.5792 };

function hav(a, b) {
  const r = (x) => (x * Math.PI) / 180;
  const s =
    Math.sin(r(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(r(a.latitude)) *
      Math.cos(r(b.latitude)) *
      Math.sin(r(b.longitude - a.longitude) / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(s));
}
const clamp = (x) => Math.max(0, Math.min(1, x));
const sans = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function reference(a, d) {
  const km = Math.round(hav(a.geo, d.geo) * 100) / 100;
  const r = Math.min(a.rayonKm, 60);
  const competent =
    (d.intention && a.intentions.includes(d.intention)) ||
    a.metierPrincipal === d.metierRequis ||
    a.metiersSecondaires.includes(d.metierRequis);
  if (!competent) return { raison: 'metier' };
  if (km > r) return { raison: 'distance' };
  if (!a.verifie) return { raison: 'non_verifie' };
  if (!a.decennaleExpireLe || a.decennaleExpireLe <= d.demarrageLe) return { raison: 'assurance' };
  for (const x of d.exigences)
    if (!a.qualifications.includes(x)) return { raison: 'exigence:' + x };
  if (a.sanctionActive) return { raison: 'sanction' };
  if (a.demandesRecuesMois >= a.quotaDemandesMois) return { raison: 'quota' };
  if (d.dejaVus.includes(a.id)) return { raison: 'deja_vu' };
  if (a.empreintes.some((e) => d.empreintesDemandeur.includes(e))) return { raison: 'conflit' };
  if (a.enPause) return { raison: 'pause' };
  if (d.budgetMaxCentimes < a.budgetMinCentimes * 0.5) return { raison: 'budget' };

  const tags = a.tags.filter((t) => d.motsReponses.some((m) => sans(m).includes(sans(t)))).length;
  const competence = clamp((a.metierPrincipal === d.metierRequis ? 1 : 0.8) + 0.1 * tags);
  const distance = clamp(1 - (km / r) ** 1.3);
  const bayes = (5 * 4.3 + a.nbAvis * a.note) / (5 + a.nbAvis);
  const qualite = clamp(clamp((bayes - 3) / 2) + a.tauxRecommandation * 0.2);
  const reactivite =
    0.6 * a.tauxReponse + 0.4 * (1 - Math.min(a.tempsReponseMoyenMin, 1440) / 1440);
  const dispo =
    a.delaiDispoJours <= d.delaiSouhaiteJours
      ? 1
      : Math.max(0, 1 - (a.delaiDispoJours - d.delaiSouhaiteJours) / 30);
  const inter = Math.max(
    0,
    Math.min(a.budgetMaxCentimes, d.budgetMaxCentimes) -
      Math.max(a.budgetMinCentimes, d.budgetMinCentimes),
  );
  const budget = clamp(inter / (d.budgetMaxCentimes - d.budgetMinCentimes));
  const completude = a.completude / 100;
  const p = C.poids;
  let s =
    100 *
    (p.competence * competence +
      p.distance * distance +
      p.qualite * qualite +
      p.reactivite * reactivite +
      p.disponibilite * dispo +
      p.adequationBudget * budget +
      p.completude * completude);
  if (a.premium) s += 12;
  if (a.optionVisibilite) s += 4;
  if (a.attributions7j > 8) s -= 10;
  if (a.tauxRefus30j > 0.5) s -= 8;
  if (a.joursDepuisVerification <= 30) s += 6;
  s = Math.round(s * 100) / 100;
  return s < 35 ? { raison: 'score_faible', score: s } : { score: s };
}

function artisan(i) {
  const bmin = choisir([0, 50_000, 300_000, 1_000_000, 4_000_000]);
  return {
    id: 'art' + i,
    siren: String(100000000 + Math.floor(h() * 20)),
    geo: {
      latitude: BORDEAUX.latitude + (h() - 0.5) * 0.5,
      longitude: BORDEAUX.longitude + (h() - 0.5) * 0.6,
    },
    rayonKm: choisir([10, 30, 30, 50, 100]),
    metierPrincipal: choisir(['plombier', 'plombier', 'carreleur', 'carreleur', 'electricien']),
    metiersSecondaires: h() < 0.4 ? [choisir(['plombier', 'carreleur', 'chauffagiste'])] : [],
    intentions: h() < 0.3 ? ['sdb-italienne'] : [],
    tags: h() < 0.5 ? [choisir(['douche italienne', 'Salle de bain', 'tableau électrique'])] : [],
    verifie: h() > 0.08,
    decennaleExpireLe: h() < 0.08 ? undefined : T0 + choisir([-5, 10, 60, 400]) * JOUR,
    qualifications: [
      'decennale',
      ...(h() < 0.5 ? ['rge'] : []),
      ...(h() < 0.3 ? ['qualibat'] : []),
    ],
    sanctionActive: h() < 0.04,
    enPause: h() < 0.04,
    demandesRecuesMois: Math.floor(h() * 5),
    quotaDemandesMois: choisir([4, 4, 20, 3]),
    empreintes: h() < 0.04 ? ['emp-demandeur'] : ['emp' + i],
    budgetMinCentimes: bmin,
    budgetMaxCentimes: bmin + choisir([500_000, 2_000_000, 8_000_000]),
    premium: h() < 0.3,
    optionVisibilite: h() < 0.2,
    note: choisir([3.5, 4.1, 4.6, 4.9, 5]),
    nbAvis: choisir([0, 3, 12, 60]),
    tauxRecommandation: choisir([0, 0.8, 0.95, 1]),
    tauxReponse: choisir([0.2, 0.6, 0.9, 1]),
    tempsReponseMoyenMin: choisir([30, 240, 900, 3000]),
    delaiDispoJours: choisir([2, 10, 30, 60]),
    completude: choisir([40, 70, 100]),
    attributions7j: choisir([0, 3, 9]),
    tauxRefus30j: choisir([0, 0.3, 0.6]),
    joursDepuisVerification: choisir([5, 40, 400]),
    ...(h() < 0.5 ? { derniereAttributionLe: T0 - Math.floor(h() * 30) * JOUR } : {}),
  };
}
function demande(i) {
  const bmin = choisir([100_000, 800_000, 2_500_000]);
  return {
    id: 'dem' + i,
    geo: {
      latitude: BORDEAUX.latitude + (h() - 0.5) * 0.4,
      longitude: BORDEAUX.longitude + (h() - 0.5) * 0.4,
    },
    metierRequis: choisir(['plombier', 'carreleur']),
    ...(h() < 0.4 ? { intention: 'sdb-italienne' } : {}),
    exigences: h() < 0.3 ? ['rge'] : [],
    budgetMinCentimes: bmin,
    budgetMaxCentimes: bmin * choisir([2, 3]),
    delaiSouhaiteJours: choisir([7, 30, 90]),
    demarrageLe: T0 + choisir([0, 30]) * JOUR,
    motsReponses: choisir([['Douche à l’italienne', '6 m²'], ['Salle de bain complète'], []]),
    empreintesDemandeur: ['emp-demandeur'],
    dejaVus: h() < 0.1 ? ['art' + i] : [],
  };
}

const cas = [];
for (let i = 0; i < 600; i++) {
  const a = artisan(i),
    d = demande(i);
  cas.push({ artisan: a, demande: d, attendu: reference(a, d) });
}
const raisons = {};
for (const c of cas)
  raisons[c.attendu.raison ?? 'retenu'] = (raisons[c.attendu.raison ?? 'retenu'] ?? 0) + 1;
writeFileSync(
  new URL('../src/matching/__tests__/matching.cases.json', import.meta.url),
  `${JSON.stringify({ _source: 'MATCHING.md §3, implémentation de référence indépendante', cas }, null, 1)}\n`,
);
console.log(cas.length, raisons);
