// Charge la logique d'une maquette .dc.html (code source de référence) dans un bac à sable Node.
// Sert UNIQUEMENT à produire les cas de test attendus : le code de production est dans src/.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const DESIGNS = new URL('../../../docs/designs/', import.meta.url);

export function chargerMaquette(
  fichier,
  { avant = [], jusqua = 'class Component', exporter = [], globaux = {} } = {},
) {
  const html = readFileSync(new URL(fichier, DESIGNS), 'utf8');
  const debut = html.indexOf('>', html.indexOf('<script type="text/x-dc" data-dc-script')) + 1;
  let code = html.slice(debut, html.indexOf('</script>', debut));
  if (jusqua && code.includes(jusqua)) code = code.slice(0, code.indexOf(jusqua));
  const bac = {
    window: {},
    console,
    Math,
    JSON,
    Date,
    URLSearchParams,
    localStorage: { getItem: () => null },
    ...globaux,
  };
  vm.createContext(bac);
  for (const f of avant) vm.runInContext(readFileSync(new URL(f, DESIGNS), 'utf8'), bac);
  vm.runInContext(`${code}\n;globalThis.__export = { ${exporter.join(', ')} };`, bac);
  return { ...bac.__export, window: bac.window };
}

/** Générateur pseudo-aléatoire déterministe (cas reproductibles). */
export function aleatoire(graine) {
  let x = graine >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
