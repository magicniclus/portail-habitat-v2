// Produit src/diagnostic/__tests__/diagnostic.cases.json à partir de la maquette Parcours Diagnostic.
import { mkdirSync, writeFileSync } from 'node:fs';
import { aleatoire, chargerMaquette } from './maquette.mjs';

const m = chargerMaquette('Parcours Diagnostic.dc.html', {
  exporter: ['DIAGS', 'CONSEILLES', 'COMMUNES', 'ANNEE'],
});
const hasard = aleatoire(20260101);
const choisir = (l) => l[Math.floor(hasard() * l.length)];

// Reproduction exacte de analyse() et du total de renderVals().
function analyse(c, faits) {
  const out = [];
  for (const d of m.DIAGS) {
    if (!d.req(c)) continue;
    const f = faits[d.id];
    let statut = 'à réaliser';
    let valide = false;
    if (f && f.actif) {
      const an = parseInt(f.annee, 10);
      const age = m.ANNEE - an;
      valide = age <= d.val && !(d.id === 'dpe' && an < 2021) && !(d.id === 'amiante' && an < 2013);
      statut = valide ? 'déjà valide' : 'à refaire';
    }
    out.push({ id: d.id, statut, valide });
  }
  for (const x of m.CONSEILLES)
    if (x.req(c)) out.push({ id: x.id, statut: 'conseillé', valide: false, conseil: true });
  const aFaire = out.filter((x) => !x.valide && !x.conseil);
  let min = 0;
  let max = 0;
  for (const x of aFaire) {
    const d = m.DIAGS.find((y) => y.id === x.id);
    min += d.prix[0];
    max += d.prix[1];
  }
  const pack = aFaire.length >= 4;
  if (pack) {
    min *= 0.88;
    max *= 0.92;
  }
  return { resultat: out.map(({ id, statut }) => ({ id, statut })), min, max, pack };
}

const cas = [];
for (let i = 0; i < 300; i++) {
  const com = choisir(m.COMMUNES);
  const c = {
    motif: choisir(['vente', 'location', 'travaux']),
    type: choisir(['appartement', 'maison', 'immeuble']),
    periode: choisir(['av1949', '1949-1976', '1977-1996', '1997-2010', 'ap2011']),
    gaz: choisir(['oui', 'non']),
    elec: choisir(['ancienne', 'recente']),
    assainissement: choisir(['collectif', 'individuel', 'inconnu']),
    classe: choisir(['inconnu', 'AB', 'CD', 'E', 'FG']),
    presquile: com.presquile,
  };
  const faits = {};
  for (const d of m.DIAGS)
    if (hasard() < 0.35)
      faits[d.id] = { actif: true, annee: String(2008 + Math.floor(hasard() * 19)) };
  cas.push({
    contexte: c,
    existants: Object.entries(faits).map(([diagId, f]) => ({ diagId, annee: Number(f.annee) })),
    attendu: analyse(c, faits),
  });
}

mkdirSync(new URL('../src/diagnostic/__tests__/', import.meta.url), { recursive: true });
writeFileSync(
  new URL('../src/diagnostic/__tests__/diagnostic.cases.json', import.meta.url),
  `${JSON.stringify({ _source: 'docs/designs/Parcours Diagnostic.dc.html (DIAGS, CONSEILLES, analyse) — prix en euros, année de référence ' + m.ANNEE, annee: m.ANNEE, cas }, null, 1)}\n`,
);
console.log(`${cas.length} cas`);
