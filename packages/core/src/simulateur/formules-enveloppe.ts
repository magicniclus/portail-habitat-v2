import { Postes, coche, lire, nombre, texte, type Paire, type Poste, type Reponses } from './types';

export interface ParametresIsolation {
  zoneM2: Record<string, Paire>;
  materiau: Record<string, number>;
  deposeM2: Paire;
  parevapeurM2: Paire;
  placoM2: Paire;
  echafaudage: Paire;
  etude: Paire;
  aides: { plafondRatio: number; parM2: number };
}

export function calcIsolation(v: Reponses, p: ParametresIsolation): Poste[] {
  const L = new Postes();
  const s = nombre(v.surface);
  L.fourchette(
    "Fourniture et pose de l'isolant",
    lire(p.zoneM2, texte(v.zone), 'zone'),
    s,
    lire(p.materiau, texte(v.materiau), 'materiau'),
  );
  if (coche(v.options, 'depose')) L.fourchette("Dépose de l'ancien isolant", p.deposeM2, s);
  if (coche(v.options, 'parevapeur')) L.fourchette('Pare-vapeur', p.parevapeurM2, s);
  if (coche(v.options, 'placo')) L.fourchette('Doublage et finition', p.placoM2, s);
  if (coche(v.options, 'echafaudage')) L.fourchette('Échafaudage', p.echafaudage);
  L.fourchette('Étude thermique et diagnostic', p.etude);
  return L.liste;
}

/** Aides estimées (MaPrimeRénov' + CEE) : min(max × 40 %, surface × 22 €). */
export function aidesIsolation(v: Reponses, p: ParametresIsolation, totalMax: number): number {
  if (v.aides !== 'oui') return 0;
  return Math.min(totalMax * p.aides.plafondRatio, nombre(v.surface) * p.aides.parM2);
}

export interface ParametresToiture {
  travauxM2: Record<string, Paire>;
  materiau: Record<string, number>;
  penteComplexe: number;
  echafaudage: { base: Paire; m2: Paire };
  zinguerie: Paire;
  isolationM2: Paire;
  velux: Paire;
  charpenteM2: Paire;
  evacuation: Paire;
}

export function calcToiture(v: Reponses, p: ParametresToiture): Poste[] {
  const L = new Postes();
  const s = nombre(v.surface);
  const c = v.pente === 'complexe' ? p.penteComplexe : 1;
  L.fourchette(
    'Couverture',
    lire(p.travauxM2, texte(v.travaux), 'travaux'),
    s,
    lire(p.materiau, texte(v.materiau), 'materiau'),
    c,
  );
  const e = p.echafaudage;
  L.ajouter('Échafaudage et sécurité', e.base[0] + s * e.m2[0], e.base[1] + s * e.m2[1]);
  if (coche(v.options, 'zinguerie')) L.fourchette('Gouttières et zinguerie', p.zinguerie);
  if (coche(v.options, 'isolation')) L.fourchette('Isolation sous toiture', p.isolationM2, s);
  if (coche(v.options, 'velux')) L.fourchette('Fenêtre de toit', p.velux);
  if (coche(v.options, 'charpente')) L.fourchette('Traitement de charpente', p.charpenteM2, s);
  L.fourchette('Évacuation des déchets', p.evacuation);
  return L.liste;
}

export interface ParametresMenuiserie {
  materiau: Record<string, number>;
  vitrage: Record<string, number>;
  depose: number;
  fournitureFenetre: Paire;
  poseFenetre: Paire;
  voletsFenetre: Paire;
  porte: Paire;
  baie: Paire;
  moustiquaireFenetre: Paire;
  evacuation: Paire;
}

export function calcMenuiserie(v: Reponses, p: ParametresMenuiserie): Poste[] {
  const L = new Postes();
  const m = lire(p.materiau, texte(v.materiau), 'materiau');
  const n = nombre(v.fenetres);
  L.fourchette(
    'Fourniture des fenêtres',
    p.fournitureFenetre,
    n,
    m,
    lire(p.vitrage, texte(v.vitrage), 'vitrage'),
  );
  L.fourchette('Pose et finitions', p.poseFenetre, n, v.depose === 'depose' ? p.depose : 1);
  if (coche(v.options, 'volets')) L.fourchette('Volets roulants', p.voletsFenetre, n);
  if (coche(v.options, 'porte')) L.fourchette("Porte d'entrée", p.porte, m);
  if (coche(v.options, 'baie')) L.fourchette('Baie coulissante', p.baie, m);
  if (coche(v.options, 'moustiquaire')) L.fourchette('Moustiquaires', p.moustiquaireFenetre, n);
  L.fourchette('Évacuation des anciennes menuiseries', p.evacuation);
  return L.liste;
}
