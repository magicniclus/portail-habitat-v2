import { normaliser } from '../recherche/texte';

/** « Mes demandes » côté artisan (maquette Mes Demandes, DATABASE `attributions`). */

export type StatutAttributionPro =
  | 'proposee'
  | 'vue'
  | 'acceptee'
  | 'refusee'
  | 'devis_envoye'
  | 'devis_accepte'
  | 'devis_refuse'
  | 'expiree';

export const ETATS_PRO = ['nouveau', 'contacte', 'converti', 'perdu'] as const;
export type EtatPro = (typeof ETATS_PRO)[number];

export const LIBELLES_ETAT_PRO: Record<EtatPro, string> = {
  nouveau: 'Nouveau',
  contacte: 'Contacté',
  converti: 'Converti',
  perdu: 'Perdu',
};

const ETATS: Record<StatutAttributionPro, EtatPro> = {
  proposee: 'nouveau',
  vue: 'nouveau',
  acceptee: 'contacte',
  devis_envoye: 'contacte',
  devis_accepte: 'converti',
  refusee: 'perdu',
  devis_refuse: 'perdu',
  expiree: 'perdu',
};

export const etatPro = (statut: StatutAttributionPro): EtatPro => ETATS[statut];

export type ActionAttribution = 'voir' | 'accepter' | 'refuser';

/**
 * Transitions permises (écrites par le serveur seulement) : une demande proposée ou vue s'accepte
 * ou se refuse ; l'ouvrir la marque vue. `null` : transition impossible.
 */
export function transitionAttribution(
  statut: StatutAttributionPro,
  action: ActionAttribution,
): StatutAttributionPro | null {
  const enAttente = statut === 'proposee' || statut === 'vue';
  if (action === 'voir') return statut === 'proposee' ? 'vue' : statut;
  if (!enAttente) return null;
  return action === 'accepter' ? 'acceptee' : 'refusee';
}

export function compterDemandesPro(liste: readonly { etat: EtatPro }[]) {
  const c = { total: liste.length, nouveau: 0, contacte: 0, converti: 0, perdu: 0 };
  for (const d of liste) c[d.etat] += 1;
  return c;
}

/** Filtres de la maquette : texte libre (chaque mot, sans accents) et état. */
export function filtrerDemandesPro<T extends { etat: EtatPro; recherche: string }>(
  liste: readonly T[],
  f: { q?: string; etat?: EtatPro },
): T[] {
  const mots = normaliser(f.q ?? '')
    .split(' ')
    .filter(Boolean);
  return liste.filter(
    (d) =>
      (!f.etat || d.etat === f.etat) &&
      (!mots.length || mots.every((m) => normaliser(d.recherche).includes(m))),
  );
}
