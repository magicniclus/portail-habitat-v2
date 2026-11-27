import { cylindre, douce, repartir, type Primitive } from './formes3dOutils';

/**
 * Canapés au dessin simple mais soigné : volumes aux arêtes adoucies (assise, coussins,
 * accoudoirs), tissu à la couleur choisie (teinte `principal`), coussins déco en `textile`,
 * pieds en bois ou en métal. Repère de l'objet : dos du côté y = -p/2.
 */
interface Modele {
  pieds: 'plinthe' | 'bois' | 'metal' | 'aucun';
  bras: 'epais' | 'fin' | 'rond' | 'aucun';
  dos: 'coussins' | 'tendu' | 'bas';
  deco?: boolean;
  capitonne?: boolean;
  modules?: boolean;
}

const MODELES: Record<string, Modele> = {
  droit: { pieds: 'plinthe', bras: 'epais', dos: 'coussins', deco: true },
  pieds: { pieds: 'bois', bras: 'fin', dos: 'coussins' },
  fauteuil: { pieds: 'bois', bras: 'fin', dos: 'coussins' },
  banquette: { pieds: 'metal', bras: 'aucun', dos: 'tendu', deco: true },
  arrondi: { pieds: 'aucun', bras: 'rond', dos: 'coussins', deco: true },
  modulable: { pieds: 'aucun', bras: 'epais', dos: 'coussins', modules: true },
  capitonne: { pieds: 'bois', bras: 'epais', dos: 'tendu', capitonne: true },
  convertible: { pieds: 'metal', bras: 'fin', dos: 'tendu' },
};

const LARGEUR_BRAS = { epais: 220, fin: 100, rond: 260, aucun: 0 } as const;
const HAUT_PIEDS = { plinthe: 60, bois: 150, metal: 130, aucun: 0 } as const;

/** Pieds aux quatre coins d'un rectangle centré en (cx, cy). */
function piedsDe(m: Modele, cx: number, cy: number, l: number, p: number): Primitive[] {
  const h = HAUT_PIEDS[m.pieds];
  if (m.pieds === 'aucun') return [];
  if (m.pieds === 'plinthe') return [douce(cx, cy + 10, 0, l - 80, p - 80, h, 10, 'sombre')];
  return [-1, 1].flatMap((i) =>
    [-1, 1].map((j) =>
      m.pieds === 'bois'
        ? cylindre(cx + i * (l / 2 - 70), cy + j * (p / 2 - 70), 0, 45, h, 'bois')
        : douce(cx + i * (l / 2 - 60), cy + j * (p / 2 - 60), 0, 25, 25, h, 4, 'metal'),
    ),
  );
}

/**
 * Banc d'assise droit (sans pieds) de x0 à x0 + l, profondeur p, dos en y0 - p/2 : socle,
 * coussins d'assise et de dossier, accoudoirs demandés (gauche / droite).
 */
function assise(
  m: Modele,
  cx: number,
  cy: number,
  l: number,
  p: number,
  h: number,
  bras: { gauche: boolean; droite: boolean; dos?: boolean },
): Primitive[] {
  const bas = HAUT_PIEDS[m.pieds];
  const coussin = 150;
  const dessus = Math.max(bas + 200, Math.round(h * 0.52));
  const socle = dessus - coussin - bas;
  const lb = LARGEUR_BRAS[m.bras];
  const hBras = m.bras === 'rond' ? dessus + 80 : Math.round(h * 0.72);
  const avecDos = bras.dos !== false;
  const epDos = m.dos === 'tendu' ? 240 : 180;
  const gauche = bras.gauche ? lb : 0;
  const droite = bras.droite ? lb : 0;
  const utile = l - gauche - droite;
  const xu = cx + (gauche - droite) / 2;
  const profAssise = p - (avecDos ? epDos : 0);
  const yAssise = cy + (avecDos ? epDos / 2 : 0);
  const n = Math.max(1, Math.round(utile / 700));
  const pas = utile / n;
  const xs = repartir(utile, n, pas / 2).map((x) => xu + x);
  const r = m.bras === 'rond' ? 90 : 45;
  const formes: Primitive[] = [];
  if (m.modules) xs.forEach((x) => formes.push(douce(x, cy, bas, pas - 20, p, socle, 30)));
  else formes.push(douce(cx, cy, bas, l, p, socle, 30));
  if (avecDos) {
    const hDos = m.dos === 'bas' ? Math.round(h * 0.75) : h;
    formes.push(douce(xu, cy - p / 2 + epDos / 2, bas, utile, epDos, hDos - bas, 50));
    if (m.capitonne)
      for (const x of repartir(utile, Math.max(2, Math.round(utile / 220)), 110))
        for (const z of [dessus + 140, dessus + 290])
          if (z < hDos - 60)
            formes.push(cylindre(xu + x, cy - p / 2 + epDos + 2, z, 22, 12, 'sombre'));
  }
  for (const x of xs) {
    formes.push(douce(x, yAssise + 10, bas + socle, pas - 20, profAssise - 30, coussin, r));
    if (avecDos && m.dos === 'coussins')
      formes.push(
        douce(
          x,
          cy - p / 2 + epDos + 90,
          dessus,
          pas - 30,
          180,
          Math.min(450, h - dessus - 20),
          80,
        ),
      );
  }
  if (bras.gauche && lb)
    formes.push(
      douce(cx - l / 2 + lb / 2, cy, bas, lb, p, hBras - bas, m.bras === 'rond' ? 120 : 50),
    );
  if (bras.droite && lb)
    formes.push(
      douce(cx + l / 2 - lb / 2, cy, bas, lb, p, hBras - bas, m.bras === 'rond' ? 120 : 50),
    );
  if (m.deco && avecDos && utile > 900)
    for (const x of [xu - utile / 2 + 260, xu + utile / 2 - 260])
      formes.push(douce(x, cy - p / 2 + epDos + 140, dessus, 380, 130, 380, 60, 'textile'));
  return formes;
}

/** Méridienne d'angle (retour vers l'avant) côté droit : assise longue sans dossier. */
function retour(m: Modele, cx: number, y0: number, prof: number, longueur: number, h: number) {
  return [
    ...piedsDe(m, cx, y0 + longueur / 2, prof, longueur),
    ...assise(m, cx, y0 + longueur / 2, prof, longueur, h, {
      gauche: false,
      droite: true,
      dos: false,
    }),
  ];
}

const miroir = (f: Primitive): Primitive => ({ ...f, centre: { ...f.centre, x: -f.centre.x } });

/** Tissu du canapé : suit la couleur choisie (sinon un lin clair). */
const enTissu = (f: Primitive): Primitive =>
  f.teinte === 'principal' ? { ...f, teinte: 'tissu' } : f;

export function canape(l: number, p: number, h: number, style = 'droit'): Primitive[] {
  return formes(l, p, h, style).map(enTissu);
}

function formes(l: number, p: number, h: number, style: string): Primitive[] {
  if (style === 'angle' || style === 'angle-gauche' || style === 'u') {
    const m = MODELES.droit!;
    const prof = Math.min(1_000, p / 2);
    const y = -p / 2 + prof / 2;
    const u = style === 'u';
    const formes = [
      ...piedsDe(m, 0, y, l, prof),
      ...assise(m, 0, y, l, prof, h, { gauche: !u, droite: false }),
      ...retour(m, l / 2 - prof / 2, -p / 2 + prof, prof, p - prof, h),
      ...(u ? retour(m, l / 2 - prof / 2, -p / 2 + prof, prof, p - prof, h).map(miroir) : []),
    ];
    return style === 'angle-gauche' ? formes.map(miroir) : formes;
  }
  if (style === 'meridienne') {
    const m: Modele = { pieds: 'bois', bras: 'rond', dos: 'bas', deco: true };
    return [
      ...piedsDe(m, 0, 0, l, p),
      ...assise(m, 0, 0, l, p, h, { gauche: true, droite: false, dos: false }),
      douce(-l / 4, -p / 2 + 90, HAUT_PIEDS.bois, l / 2, 180, h - HAUT_PIEDS.bois, 60),
    ];
  }
  const m = MODELES[style] ?? MODELES.droit!;
  return [...piedsDe(m, 0, 0, l, p), ...assise(m, 0, 0, l, p, h, { gauche: true, droite: true })];
}
