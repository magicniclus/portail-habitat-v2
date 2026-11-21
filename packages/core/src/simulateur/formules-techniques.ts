import { Postes, coche, lire, nombre, texte, type Paire, type Poste, type Reponses } from './types';

export interface ParametresElec {
  encastre: number;
  tableau: Record<string, Paire>;
  prise: Paire;
  interrupteur: Paire;
  cablageM2: Paire;
  saigneesM2: Paire;
  rj45: Paire;
  spots: Paire;
  borne: Paire;
  domotique: Paire;
  consuel: Paire;
}

export function calcElec(v: Reponses, p: ParametresElec): Poste[] {
  const L = new Postes();
  const encastre = v.encastre === 'encastre';
  const enc = encastre ? p.encastre : 1;
  const s = nombre(v.surface);
  L.fourchette('Tableau électrique', lire(p.tableau, texte(v.tableau), 'tableau'));
  L.fourchette('Prises de courant', p.prise, nombre(v.prises), enc);
  L.fourchette("Points d'éclairage et interrupteurs", p.interrupteur, nombre(v.interrupteurs), enc);
  L.fourchette('Passage des gaines et câblage', p.cablageM2, s, enc);
  if (encastre) L.fourchette('Saignées et rebouchage', p.saigneesM2, s);
  if (coche(v.options, 'rj45')) L.fourchette('Réseau RJ45', p.rj45);
  if (coche(v.options, 'spots')) L.fourchette('Spots encastrés', p.spots);
  if (coche(v.options, 'borne')) L.fourchette('Borne de recharge', p.borne);
  if (coche(v.options, 'domotique')) L.fourchette('Domotique', p.domotique);
  if (coche(v.options, 'consuel')) L.fourchette('Attestation Consuel', p.consuel);
  return L.liste;
}

export interface ParametresPlomberie {
  encastre: number;
  intervention: Record<string, Paire>;
  point: Record<string, Paire>;
  chauffeEau: Paire;
  adoucisseur: Paire;
  evacuation: Paire;
  colonne: Paire;
  urgence: Record<string, number>;
}

export function calcPlomberie(v: Reponses, p: ParametresPlomberie): Poste[] {
  const L = new Postes();
  const enc = v.pose === 'encastre' ? p.encastre : 1;
  const nature = texte(v.nature);
  L.fourchette('Déplacement et intervention', lire(p.intervention, nature, 'nature'));
  L.fourchette("Points d'eau", lire(p.point, nature, 'nature'), nombre(v.points), enc);
  if (coche(v.equipements, 'chauffeEau')) L.fourchette('Chauffe-eau', p.chauffeEau);
  if (coche(v.equipements, 'adoucisseur')) L.fourchette('Adoucisseur', p.adoucisseur);
  if (coche(v.equipements, 'evacuation')) L.fourchette("Reprise d'évacuation", p.evacuation);
  if (coche(v.equipements, 'colonne')) L.fourchette('Colonne de douche', p.colonne);
  const u = lire(p.urgence, texte(v.urgence), 'urgence');
  if (u > 1) L.multiplier(u);
  return L.liste;
}
