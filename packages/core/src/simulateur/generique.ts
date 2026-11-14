import {
  Postes,
  coche,
  nombre,
  texte,
  type Poste,
  type Reponses,
  type TarifGenerique,
} from './types';

/**
 * Calcul générique du catalogue (103 prestations) :
 * quantité × unitaire × produit des coefficients choisis + base + options + évacuation.
 */
export function calcGenerique(v: Reponses, t: TarifGenerique): Poste[] {
  const L = new Postes();
  const q = nombre(v.q);
  let k = 1;
  for (const [champ, , , options] of t.choix) {
    const o = options.find((x) => x[0] === texte(v[champ]));
    if (o) k *= o[3];
  }
  L.fourchette(t.lib, t.unitaire, q, k);
  L.fourchette('Déplacement, préparation et mise en service', t.base);
  for (const e of t.extras) {
    if (!coche(v.extras, e[0])) continue;
    const parUnite = e.length === 5;
    L.ajouter(e[1], parUnite ? e[2] * q : e[2], parUnite ? e[3] * q : e[3]);
  }
  L.fourchette('Évacuation et nettoyage', t.evac);
  return L.liste;
}

/** Le catalogue est saisi en euros : conversion en centimes entiers avant tout calcul. */
export function tarifEnCentimes(t: TarifGenerique): TarifGenerique {
  const c = (n: number) => Math.round(n * 100);
  return {
    ...t,
    unitaire: [c(t.unitaire[0]), c(t.unitaire[1])],
    base: [c(t.base[0]), c(t.base[1])],
    evac: [c(t.evac[0]), c(t.evac[1])],
    extras: t.extras.map((e) =>
      e.length === 5 ? [e[0], e[1], c(e[2]), c(e[3]), e[4]] : [e[0], e[1], c(e[2]), c(e[3])],
    ),
  };
}
