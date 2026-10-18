import { Postes, coche, lire, nombre, texte, type Paire, type Poste, type Reponses } from './types';

type Gamme = Record<string, number>;

export interface ParametresPeinture {
  gamme: Gamme;
  hauteur: Record<string, number>;
  etat: Record<string, number>;
  preparationM2: Paire;
  mursM2: Paire;
  plafonds: { ratioSurface: number; m2: Paire };
  boiseriesPiece: Paire;
  fissuresM2: Paire;
  radiateursPiece: Paire;
  nettoyage: { base: Paire; parPiece: Paire };
}

export function calcPeinture(v: Reponses, p: ParametresPeinture): Poste[] {
  const L = new Postes();
  const h = lire(p.hauteur, texte(v.hauteur), 'hauteur');
  const e = lire(p.etat, texte(v.etat), 'etat');
  const g = lire(p.gamme, texte(v.gamme), 'gamme');
  const s = nombre(v.surface);
  const pieces = nombre(v.pieces);
  L.fourchette('Protection et préparation des supports', p.preparationM2, s, e, h);
  L.fourchette('Peinture des murs (2 couches)', p.mursM2, s, g, h);
  if (coche(v.extras, 'plafonds'))
    L.fourchette('Plafonds', p.plafonds.m2, s, p.plafonds.ratioSurface, g);
  if (coche(v.extras, 'boiseries')) L.fourchette('Portes et boiseries', p.boiseriesPiece, pieces);
  if (coche(v.extras, 'fissures')) L.fourchette('Reprise de fissures et enduit', p.fissuresM2, s);
  if (coche(v.extras, 'radiateurs'))
    L.fourchette('Dépose et repose des radiateurs', p.radiateursPiece, pieces);
  const n = p.nettoyage;
  L.ajouter(
    'Nettoyage et évacuation',
    n.base[0] + pieces * n.parPiece[0],
    n.base[1] + pieces * n.parPiece[1],
  );
  return L.liste;
}

export interface ParametresSdb {
  gamme: Gamme;
  depose: { base: Paire; m2: Paire };
  plomberie: { base: Paire; m2: Paire };
  reseauPartiel: Paire;
  reseauTotal: Paire;
  electricite: Paire;
  carrelageM2: Paire;
  equipements: Record<string, Paire>;
  pmr: Paire;
  vmc: Paire;
  fenetre: Paire;
  finitions: Paire;
  creation: { min: number; max: number };
}

export function calcSdb(v: Reponses, p: ParametresSdb): Poste[] {
  const L = new Postes();
  const g = lire(p.gamme, texte(v.gamme), 'gamme');
  const s = nombre(v.surface);
  const lineaire = (x: { base: Paire; m2: Paire }): Paire => [
    x.base[0] + s * x.m2[0],
    x.base[1] + s * x.m2[1],
  ];
  if (v.ampleur !== 'raf') L.fourchette('Dépose et évacuation', lineaire(p.depose));
  L.fourchette('Plomberie', lineaire(p.plomberie));
  if (v.reseaux === 'partiel') L.fourchette("Déplacement d'un réseau", p.reseauPartiel);
  if (v.reseaux === 'total') L.fourchette('Nouvelle implantation des réseaux', p.reseauTotal);
  L.fourchette('Électricité et ventilation', p.electricite);
  L.fourchette('Carrelage sol et faïence', p.carrelageM2, s, g);
  let a = 0;
  let b = 0;
  for (const k of Array.isArray(v.equipements) ? v.equipements : []) {
    const eq = p.equipements[k];
    if (eq) {
      a += eq[0] * g;
      b += eq[1] * g;
    }
  }
  L.ajouter('Équipements et robinetterie', a, b);
  if (coche(v.pmr, 'pmr')) L.fourchette('Adaptation PMR', p.pmr);
  if (coche(v.pmr, 'vmc')) L.fourchette('VMC', p.vmc);
  if (coche(v.pmr, 'fenetre')) L.fourchette('Fenêtre', p.fenetre);
  L.fourchette('Peinture et finitions', p.finitions);
  if (v.ampleur === 'crea') L.multiplier(p.creation.min, p.creation.max);
  return L.liste;
}

export interface ParametresCuisine {
  gamme: Gamme;
  forme: Record<string, number>;
  meublesMl: Paire;
  poseMl: Paire;
  planMl: Paire;
  credence: Paire;
  electromenager: Paire;
  eclairage: Paire;
  solMl: Paire;
  reseaux: Record<string, Paire>;
  alimentationIlot: Paire;
}

export function calcCuisine(v: Reponses, p: ParametresCuisine): Poste[] {
  const L = new Postes();
  const g = lire(p.gamme, texte(v.gamme), 'gamme');
  const f = lire(p.forme, texte(v.forme), 'forme');
  const m = nombre(v.lineaire);
  L.fourchette('Meubles et façades', p.meublesMl, m, g, f);
  L.fourchette('Pose et ajustage', p.poseMl, m, f);
  if (coche(v.elements, 'plan')) L.fourchette('Plan de travail', p.planMl, m, g);
  if (coche(v.elements, 'credence')) L.fourchette('Crédence', p.credence);
  if (coche(v.elements, 'electro')) L.fourchette('Électroménager', p.electromenager, g);
  if (coche(v.elements, 'eclairage')) L.fourchette('Éclairage intégré', p.eclairage);
  if (coche(v.elements, 'sol')) L.fourchette('Sol', p.solMl, m);
  L.fourchette('Plomberie et électricité', lire(p.reseaux, texte(v.reseaux), 'reseaux'));
  if (v.forme === 'ilot') L.fourchette("Alimentation de l'îlot", p.alimentationIlot);
  return L.liste;
}

export interface ParametresCarrelage {
  format: Record<string, number>;
  fournitureM2: Record<string, Paire>;
  poseSolM2: Paire;
  poseMurM2: Paire;
  deposeM2: Paire;
  ragreageM2: Paire;
  etancheiteM2: Paire;
  chauffantM2: Paire;
  jointsM2: Paire;
}

export function calcCarrelage(v: Reponses, p: ParametresCarrelage): Poste[] {
  const L = new Postes();
  const f = lire(p.format, texte(v.format), 'format');
  const sol = nombre(v.sol);
  const murs = nombre(v.murs);
  const tot = sol + murs;
  L.fourchette('Fourniture des carreaux', lire(p.fournitureM2, texte(v.gamme), 'gamme'), tot);
  L.fourchette('Pose au sol', p.poseSolM2, sol, f);
  L.fourchette('Pose murale', p.poseMurM2, murs, f);
  if (coche(v.preparation, 'depose'))
    L.fourchette("Dépose de l'ancien revêtement", p.deposeM2, tot);
  if (coche(v.preparation, 'ragreage')) L.fourchette('Ragréage', p.ragreageM2, sol);
  if (coche(v.preparation, 'etancheite'))
    L.fourchette('Étanchéité sous carrelage', p.etancheiteM2, tot);
  if (coche(v.preparation, 'chauffant')) L.fourchette('Plancher chauffant', p.chauffantM2, sol);
  L.fourchette('Joints et finitions', p.jointsM2, tot);
  return L.liste;
}
