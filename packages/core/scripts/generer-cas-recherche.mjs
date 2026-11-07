// Produit src/recherche/__tests__/recherche.cases.json en exécutant docs/designs/recherche-projets.js.
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { aleatoire } from './maquette.mjs';

const bac = { window: {}, console };
vm.createContext(bac);
// Maquette + correctif de pertinence du lot 3 (bonus de correspondance exacte, RECHERCHE.md §2).
const code = readFileSync(
  new URL('../../../docs/designs/recherche-projets.js', import.meta.url),
  'utf8',
).replace(
  'return s * (0.35 + 0.65 * cov * cov) + it.pop * 0.6;',
  'if (it.nl === qnorm) s += 8; else if (it.nk.some((k) => k === qnorm)) s += 4;\n    return s * (0.35 + 0.65 * cov * cov) + it.pop * 0.6;',
);
if (!code.includes('s += 8')) throw new Error('Correctif non appliqué : la maquette a changé');
// Mots vides ajoutés au lot 3.
const codeVides = code.replace('urgent urgence svp', 'urgent urgence svp qui que quoi');
// Mots-clés ajoutés au lot 3 (exemples obligatoires de RECHERCHE.md §6), reportés dans docs/data/recherche-intentions.json.
// Injectés avant la construction de l'index de la maquette.
const AJOUTS = {
  'pac-air-eau': [
    'remplacer chaudiere fioul par pompe a chaleur',
    'remplacer chaudiere fioul',
    'chaudiere fioul par pompe a chaleur',
  ],
  'toiture-fuite': ['toit qui fuit', 'toit fuit', 'fuite du toit'],
};
const avecAjouts = codeVides.replace(
  '  // ---------- Synonymes',
  `  L.forEach((it) => { (${JSON.stringify(AJOUTS)}[it.id] || []).forEach((k) => it.k.push(k)); });\n` +
    // « toit qui fuit » décrit une fuite, pas une rénovation : retiré de toiture-renovation.
    `  L.forEach((it) => { if (it.id === 'toiture-renovation') it.k = it.k.filter((k) => k !== 'toit qui fuit'); });\n  // ---------- Synonymes`,
);
if (avecAjouts === codeVides) throw new Error('Mots-clés non injectés : la maquette a changé');
vm.runInContext(avecAjouts, bac);
const R = bac.window.PH_RECHERCHE;
const hasard = aleatoire(424242);

const faute = (mot) => {
  if (mot.length < 5) return mot;
  const i = 1 + Math.floor(hasard() * (mot.length - 2));
  return hasard() < 0.5
    ? mot.slice(0, i) + mot[i + 1] + mot[i] + mot.slice(i + 2)
    : mot.slice(0, i) + mot.slice(i + 1);
};

const requetes = new Set([
  'renovation de salle de bain',
  'sdb',
  'douche italiene',
  'carlage',
  'refaire ma cuisine',
  'pac',
  'remplacer chaudiere fioul par pompe a chaleur',
  'chaudier',
  'toit qui fuit urgent',
  'wc bouché',
  'ipn',
  'volet roulant bloqué',
  'isolation combles perdus',
  'mettre une borne de recharge',
  'peindre mon salon',
  'fosse septique',
  'xyzabc',
  'a',
  '',
  'Clim',
  'PLOMBIER URGENT ce soir',
  'œil de bœuf',
  "l'électricité",
  'travaux',
]);
for (const it of R.INTENTIONS) {
  requetes.add(it.l);
  requetes.add(it.k[0]);
  if (it.k[1]) requetes.add(faute(it.k[1]));
  requetes.add(it.l.slice(0, 3 + Math.floor(hasard() * 5)));
}
const cas = [...requetes].map((q) => {
  const r = R.rechercher(q);
  return {
    q,
    attendu: {
      ids: r.resultats.map((x) => x.id),
      scores: r.resultats.map((x) => x.score),
      segments: r.resultats.map((x) => x.segments),
      correction: r.correction,
      urgence: r.urgence,
      metiers: r.metiers.map((m) => m.id),
      associees: (r.associees || []).map((a) => a.id),
    },
  };
});
const metiers = [
  'plom',
  'couvreur',
  'electricien',
  'macon',
  'chauffagiste',
  'peintre',
  'frigoriste',
  'plaquiste',
  'menuisier',
  'zingueur',
  '',
].map((q) => ({ q, attendu: R.rechercherMetiers(q).map((m) => m.id) }));

writeFileSync(
  new URL('../src/recherche/__tests__/recherche.cases.json', import.meta.url),
  `${JSON.stringify({ _source: 'docs/designs/recherche-projets.js (rechercher, rechercherMetiers)', intentions: R.INTENTIONS.map((i) => ({ id: i.id, m: i.m, p: i.p, pop: i.pop })), cas, metiers }, null, 1)}\n`,
);
console.log(`${cas.length} requêtes, ${metiers.length} requêtes métiers`);
