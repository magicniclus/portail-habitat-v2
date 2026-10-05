import { formatNombre } from '../format/nombres';
import type { PageSuivie } from './mesure';

/** Libellés de l'admin › Comportement (COMPORTEMENT §6). */
export const PAGES_COMPORTEMENT: Readonly<Record<PageSuivie, { nom: string; chemin: string }>> = {
  'acquisition-artisans': { nom: 'Landing pro · acquisition artisans', chemin: '/pro' },
  accueil: { nom: 'Accueil particuliers', chemin: '/' },
  simulateur: { nom: 'Simulateur de devis', chemin: '/simulateur' },
  diagnostic: { nom: 'Landing diagnostic immobilier', chemin: '/diagnostic-immobilier' },
  annuaire: { nom: 'Annuaire des artisans', chemin: '/artisans' },
};

export const CALQUES_COMPORTEMENT = [
  { id: 'clics', nom: 'Clics', legende: 'Densité des clics. Rouge = zone la plus cliquée.' },
  {
    id: 'mouvements',
    nom: 'Trajets du curseur',
    legende: 'Densité des mouvements du curseur (ordinateur, 10 % des sessions).',
  },
  {
    id: 'attention',
    nom: 'Attention',
    legende: 'Durée cumulée des arrêts du curseur (≥ 600 ms). Indique ce qui est lu.',
  },
  {
    id: 'defilement',
    nom: 'Défilement',
    legende: 'Part des visiteurs qui atteignent chaque hauteur. Lignes : 75 %, 50 %, 25 %.',
  },
  {
    id: 'frictions',
    nom: 'Clics morts et rage',
    legende: 'Clics sur des éléments non cliquables et clics répétés de frustration.',
  },
  {
    id: 'sorties',
    nom: 'Sorties',
    legende: 'Dernière section vue avant de quitter la page, hors conversions.',
  },
] as const;
export type CalqueComportement = (typeof CALQUES_COMPORTEMENT)[number]['id'];

export const LIBELLES_ALERTE_COMPORTEMENT: Readonly<Record<string, string>> = {
  clic_mort: 'Clic mort',
  rage: 'Rage',
  hesitation: 'Hésitation',
  sortie: 'Sortie',
  baisse_conversion: 'Baisse de conversion',
  element_invisible: 'Visibilité',
};

export const LIBELLES_ISSUE_REPLAY: Readonly<Record<string, string>> = {
  conversion: 'Conversion',
  rage: 'Clic de rage',
  abandon: 'Abandon formulaire',
  sortie: 'Sortie',
};

/** Part en pourcentage, une décimale au plus (`0,054` → « 5,4 % »). */
export function formatPart(x: number) {
  const v = Math.round(x * 1000) / 10;
  return `${formatNombre(v, Number.isInteger(v) ? 0 : 1)} %`;
}
const pct = formatPart;

/** Durée de visite : « 45 s », « 1 min 05 ». */
export function formatDureeVisite(ms: number) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
}

/** Phrase d'explication d'une alerte, avec ses chiffres. */
export function texteAlerte(a: { type: string; valeur: number; reference: number }): string {
  switch (a.type) {
    case 'clic_mort':
      return `${pct(a.valeur)} des visiteurs cliquent dessus alors qu’il n’est pas cliquable (seuil ${pct(a.reference)}).`;
    case 'rage':
      return `Clics répétés de frustration pour ${pct(a.valeur)} des sessions.`;
    case 'hesitation':
      return `${pct(a.valeur)} des visiteurs s’arrêtent plus de 2 s dessus sans cliquer.`;
    case 'sortie':
      return `${pct(a.valeur)} des visiteurs qui l’atteignent partent ici (moyenne des sections ${pct(a.reference)}).`;
    case 'baisse_conversion':
      return `Conversion à ${pct(a.valeur)} sur 7 jours, contre ${pct(a.reference)} les 28 jours précédents.`;
    default:
      return `${pct(a.valeur)} (référence ${pct(a.reference)}).`;
  }
}
