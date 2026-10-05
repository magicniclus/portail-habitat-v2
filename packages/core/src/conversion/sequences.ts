import type { NomModele } from '../notifications/catalogue';
import type { EtapeCycle } from './index';

/** Séquences en données (CONVERSION §3 et §9) : éditables depuis l'admin, lues par le moteur. */
export interface EtapeSequence {
  modele: NomModele | (string & {});
  declencheur: 'immediat' | 'delai' | 'signal' | 'planifie';
  /** Délai : jours depuis l'entrée dans la séquence. Planifié : « mensuel », « hebdo ». */
  valeur?: string | number;
  ab?: string[];
}

export type PasSequence =
  | { type: 'envoyer'; index: number; modele: string }
  | { type: 'attendre'; le: number }
  | { type: 'fin' };

const J = 86_400_000;

/**
 * Prochain pas du calendrier à partir de `position` : les étapes « signal » et « planifie » ne
 * sont pas dans le fil (elles partent sur un événement ou une tâche planifiée).
 */
export function prochainPas(
  seq: { etapes: readonly EtapeSequence[] },
  position: number,
  depuis: number,
  maintenant: number,
): PasSequence {
  for (let i = position; i < seq.etapes.length; i++) {
    const e = seq.etapes[i]!;
    if (e.declencheur === 'signal' || e.declencheur === 'planifie') continue;
    const le = e.declencheur === 'immediat' ? depuis : depuis + Number(e.valeur ?? 0) * J;
    return maintenant >= le
      ? { type: 'envoyer', index: i, modele: e.modele }
      : { type: 'attendre', le };
  }
  return { type: 'fin' };
}

/** Variante A/B stable pour une entreprise et un modèle. */
export function variante(artisanId: string, modele: string, ab: readonly string[] | undefined) {
  if (!ab?.length) return undefined;
  let h = 7;
  for (const c of `${artisanId}:${modele}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ab[h % ab.length];
}

/** Séquence d'une étape (S2 et S3 restent les relances d'inscription existantes). */
export function sequencePourEtape(
  etape: EtapeCycle,
  offre: 'visibilite' | 'premium',
): string | null {
  switch (etape) {
    case 'prospect':
      return 'S1';
    case 'gratuit_actif':
      return offre === 'premium' ? 'S5' : 'S4';
    case 'visibilite':
      return 'S6';
    case 'premium':
      return 'S7';
    case 'resiliation_demandee':
      return 'S8';
    case 'ancien_client':
      return 'S9';
    default:
      return null;
  }
}

const d = (modele: string, jours: number): EtapeSequence => ({
  modele,
  declencheur: 'delai',
  valeur: jours,
});
const sig = (modele: string): EtapeSequence => ({ modele, declencheur: 'signal' });

/** Séquences initiales (CONVERSION §3), recopiées dans `sequences/` par le seed. */
export const SEQUENCES_DEFAUT: Record<
  string,
  { nom: string; etapeEntree: EtapeCycle; objectif: string; etapes: EtapeSequence[] }
> = {
  S1: {
    nom: 'Prospect → inscription',
    etapeEntree: 'prospect',
    objectif: 'commencer l’inscription',
    etapes: [
      { modele: 'prospect-estimation', declencheur: 'immediat' },
      sig('prospect-demande-zone'),
      d('prospect-temoignage', 5),
      d('prospect-derniere', 12),
      { modele: 'resume-zone-mensuel', declencheur: 'planifie', valeur: 'mensuel' },
    ],
  },
  S4: {
    nom: 'Gratuit → Visibilité',
    etapeEntree: 'gratuit_actif',
    objectif: '1er paiement',
    etapes: [
      d('vis-position', 3),
      sig('vis-concurrents'),
      sig('vis-recherches-manquees'),
      d('vis-offre-lancement', 14),
      d('vis-offre-rappel', 17),
      d('vis-offre-relance', 104),
    ],
  },
  S5: {
    nom: 'Gratuit → Premium direct',
    etapeEntree: 'gratuit_actif',
    objectif: '1er paiement Premium',
    etapes: [d('vis-position', 3), sig('prem-demandes-manquees'), sig('prem-credits')],
  },
  S6: {
    nom: 'Visibilité → Premium',
    etapeEntree: 'visibilite',
    objectif: 'passage à Premium',
    etapes: [
      d('prem-bilan-visibilite', 30),
      sig('prem-demandes-manquees'),
      sig('prem-credits'),
      sig('prem-appel-offres-complet'),
    ],
  },
  S7: {
    nom: 'Mensuel → annuel, fidélité',
    etapeEntree: 'premium',
    objectif: 'passage à l’année',
    etapes: [d('passage-annuel', 90), sig('garantie-tenue')],
  },
  S8: {
    nom: 'Rétention',
    etapeEntree: 'resiliation_demandee',
    objectif: 'rester abonné',
    etapes: [{ modele: 'resiliation-alternative', declencheur: 'immediat' }],
  },
  S9: {
    nom: 'Reconquête',
    etapeEntree: 'ancien_client',
    objectif: 'reprise',
    etapes: [d('reconquete-1', 30), d('reconquete-2', 90)],
  },
};
