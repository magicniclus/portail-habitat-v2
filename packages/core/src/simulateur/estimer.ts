import {
  aidesIsolation,
  calcIsolation,
  calcMenuiserie,
  calcToiture,
  type ParametresIsolation,
  type ParametresMenuiserie,
  type ParametresToiture,
} from './formules-enveloppe';
import {
  calcCarrelage,
  calcCuisine,
  calcPeinture,
  calcSdb,
  type ParametresCarrelage,
  type ParametresCuisine,
  type ParametresPeinture,
  type ParametresSdb,
} from './formules-interieur';
import {
  calcElec,
  calcPlomberie,
  type ParametresElec,
  type ParametresPlomberie,
} from './formules-techniques';
import { calcGenerique } from './generique';
import type { Acces, Coefficients, Poste, Reponses, TarifGenerique } from './types';

export interface ParametresDetailles {
  peinture: ParametresPeinture;
  sdb: ParametresSdb;
  cuisine: ParametresCuisine;
  elec: ParametresElec;
  plomberie: ParametresPlomberie;
  carrelage: ParametresCarrelage;
  isolation: ParametresIsolation;
  toiture: ParametresToiture;
  menuiserie: ParametresMenuiserie;
}

/** Tous les prix, lus côté serveur dans referentiel/prestations/prix (jamais envoyés au client). */
export interface Referentiel {
  version: string;
  coefficients: Coefficients;
  detailles: ParametresDetailles;
  /** Tarifs du catalogue générique, en centimes. */
  catalogue: Readonly<Record<string, TarifGenerique>>;
  /** Taux de TVA des prestations du catalogue (en pourcentage : 5.5, 10, 20). */
  tvaCatalogue: Readonly<Record<string, number>>;
}

const TVA_REDUITE = ['isolation', 'toiture', 'menuiserie'];

export function coefRegion(codePostal: string, c: Coefficients): { coef: number; note: string } {
  const dep = codePostal.slice(0, 2);
  const region = c.regions.find((r) => r.departements.includes(dep));
  if (region) return { coef: region.coef, note: region.note };
  return /^\d{5}$/.test(codePostal) ? c.autreDepartement : c.sansCodePostal;
}

/** Taux de TVA en pourcentage : 5,5 % rénovation énergétique, 20 % travaux neufs du catalogue, sinon 10 %. */
export function tauxTva(prestationId: string, r: Referentiel): number {
  if (TVA_REDUITE.includes(prestationId)) return 5.5;
  return r.tvaCatalogue[prestationId] ?? 10;
}

function postesBruts(id: string, v: Reponses, r: Referentiel): Poste[] {
  const d = r.detailles;
  switch (id) {
    case 'peinture':
      return calcPeinture(v, d.peinture);
    case 'sdb':
      return calcSdb(v, d.sdb);
    case 'cuisine':
      return calcCuisine(v, d.cuisine);
    case 'elec':
      return calcElec(v, d.elec);
    case 'plomberie':
      return calcPlomberie(v, d.plomberie);
    case 'carrelage':
      return calcCarrelage(v, d.carrelage);
    case 'isolation':
      return calcIsolation(v, d.isolation);
    case 'toiture':
      return calcToiture(v, d.toiture);
    case 'menuiserie':
      return calcMenuiserie(v, d.menuiserie);
  }
  const tarif = r.catalogue[id];
  if (!tarif) throw new RangeError(`Prestation inconnue : ${id}`);
  return calcGenerique(v, tarif);
}

export interface Demande {
  prestationId: string;
  reponses: Reponses;
  codePostal: string;
  acces: Acces;
}

export interface Estimation {
  /** Postes après coefficients, en centimes entiers. */
  postes: { label: string; minCentimes: number; maxCentimes: number }[];
  minCentimes: number;
  maxCentimes: number;
  aidesCentimes: number;
  coefRegion: number;
  coefAcces: number;
  noteRegion: string;
  tvaPourcent: number;
  versionReferentiel: string;
}

/**
 * Estimation d'un projet, recalculée CÔTÉ SERVEUR avec les prix privés (règle n° 3).
 * Même calcul que la maquette : postes × région × accès, aides déduites (isolation), plancher à 0.
 */
export function estimer(d: Demande, r: Referentiel): Estimation {
  const region = coefRegion(d.codePostal, r.coefficients);
  const coefAcces = r.coefficients.acces[d.acces];
  const coef = region.coef * coefAcces;
  const bruts = postesBruts(d.prestationId, d.reponses, r);
  let min = 0;
  let max = 0;
  for (const p of bruts) {
    min += p.min * coef;
    max += p.max * coef;
  }
  const aides =
    d.prestationId === 'isolation' ? aidesIsolation(d.reponses, r.detailles.isolation, max) : 0;
  return {
    postes: bruts.map((p) => ({
      label: p.label,
      minCentimes: Math.round(p.min * coef),
      maxCentimes: Math.round(p.max * coef),
    })),
    minCentimes: Math.round(Math.max(0, min - aides)),
    maxCentimes: Math.round(Math.max(0, max - aides)),
    aidesCentimes: Math.round(aides),
    coefRegion: region.coef,
    coefAcces,
    noteRegion: region.note,
    tvaPourcent: tauxTva(d.prestationId, r),
    versionReferentiel: r.version,
  };
}

/** Arrondi d'affichage de la maquette : à la dizaine d'euros. */
export function arrondiAffichage(centimes: number): number {
  return Math.round(centimes / 1000) * 1000;
}
