import { normaliser } from './texte';

/** Score au-dessus duquel le meilleur résultat est retenu sans choix explicite (RECHERCHE §3). */
export const SCORE_NET = 8;

interface Retenue {
  id: string;
  prestation: string;
  metierId: string;
  score: number;
}

export interface Validation {
  projet: string;
  cp: string;
  delai: string;
  /** Suggestion choisie dans la liste. */
  choix?: Retenue;
  /** Meilleur résultat de la saisie, si rien n'a été choisi. */
  meilleur?: Retenue;
}

/**
 * Destination du formulaire « Quel est votre projet ? » (RECHERCHE §3, RCH-04) :
 * prestation → simulateur à l'étape 2 ; `diagnostic` → parcours diagnostic ; sinon demande libre.
 */
export function cibleRecherche(v: Validation): string {
  const retenue = v.choix ?? (v.meilleur && v.meilleur.score >= SCORE_NET ? v.meilleur : undefined);
  const p = new URLSearchParams();
  const cp = /^\d{5}$/.test(v.cp.trim()) ? v.cp.trim() : '';
  if (retenue?.prestation === 'diagnostic') {
    p.set('intention', retenue.id);
    if (cp) p.set('cp', cp);
    return `/diagnostic-immobilier/estimation?${p}`;
  }
  if (retenue) {
    p.set('prestation', retenue.prestation);
    p.set('intention', retenue.id);
  } else {
    const projet = v.projet.trim().slice(0, 120);
    if (projet) p.set('projet', projet);
    if (v.meilleur) p.set('metier', v.meilleur.metierId);
  }
  if (cp) p.set('cp', cp);
  if (v.delai) p.set('delai', v.delai);
  const q = p.toString();
  return q ? `/simulateur?${q}` : '/simulateur';
}

/**
 * Requête telle qu'enregistrée dans `evenements` : normalisée, 80 caractères, sans email ni suite
 * de 5 chiffres ou plus (téléphone, code postal) : aucune donnée personnelle (règle n° 8).
 */
export function requeteJournal(q: string): string {
  const sansEmail = q.replace(/\S+@\S+/g, ' ');
  const sansNumeros = sansEmail.replace(/(?:\d[\s.-]?){5,}/g, ' ');
  return normaliser(sansNumeros).replace(/\s+/g, ' ').trim().slice(0, 80);
}
