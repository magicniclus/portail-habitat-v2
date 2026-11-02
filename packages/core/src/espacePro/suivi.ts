import type { StatutAttributionPro } from './demandes';

/**
 * Suivi façon CRM de « Mes demandes » : étape choisie par l'artisan (privée, sans effet sur la
 * facturation ni sur le statut de la mise en relation), note et date de relance.
 */
export const ETAPES_SUIVI = [
  'nouvelle',
  'a_appeler',
  'appele',
  'rdv',
  'devis_a_faire',
  'devis_envoye',
  'gagne',
  'perdu',
] as const;
export type EtapeSuivi = (typeof ETAPES_SUIVI)[number];

/** Étapes que l'artisan peut choisir (« nouvelle » précède l'acceptation). */
export const ETAPES_CHOISIES = ETAPES_SUIVI.filter(
  (e): e is Exclude<EtapeSuivi, 'nouvelle'> => e !== 'nouvelle',
);
export type EtapeChoisie = (typeof ETAPES_CHOISIES)[number];

export const LIBELLES_ETAPE: Record<EtapeSuivi, string> = {
  nouvelle: 'Nouvelle',
  a_appeler: 'À appeler',
  appele: 'Appelé',
  rdv: 'Rendez-vous',
  devis_a_faire: 'Devis à faire',
  devis_envoye: 'Devis envoyé',
  gagne: 'Gagné',
  perdu: 'Perdu',
};

const PAR_STATUT: Record<StatutAttributionPro, EtapeSuivi> = {
  proposee: 'nouvelle',
  vue: 'nouvelle',
  acceptee: 'a_appeler',
  devis_envoye: 'devis_envoye',
  devis_accepte: 'gagne',
  devis_refuse: 'perdu',
  refusee: 'perdu',
  expiree: 'perdu',
};

/**
 * Étape affichée : celle choisie par l'artisan une fois la demande acceptée (les coordonnées sont
 * visibles), sinon celle qui découle du statut de la mise en relation.
 */
export function etapeSuivi(statut: StatutAttributionPro, choisie?: EtapeChoisie): EtapeSuivi {
  const deduite = PAR_STATUT[statut];
  if (deduite === 'nouvelle' || statut === 'refusee' || statut === 'expiree') return deduite;
  return choisie ?? deduite;
}

const JOUR_MS = 86_400_000;

/** À relancer : date de relance aujourd'hui ou passée, demande ni gagnée ni perdue. */
export function aRelancer(
  d: { suivi: { etape: EtapeSuivi; relanceLe?: number } },
  maintenant: number,
): boolean {
  const r = d.suivi.relanceLe;
  if (r === undefined || d.suivi.etape === 'gagne' || d.suivi.etape === 'perdu') return false;
  return Math.floor(r / JOUR_MS) <= Math.floor(maintenant / JOUR_MS);
}

export function compterEtapes(
  liste: readonly { suivi: { etape: EtapeSuivi; relanceLe?: number } }[],
  maintenant: number,
): Record<EtapeSuivi | 'relance', number> {
  const c = Object.fromEntries([...ETAPES_SUIVI, 'relance'].map((e) => [e, 0])) as Record<
    EtapeSuivi | 'relance',
    number
  >;
  for (const d of liste) {
    c[d.suivi.etape] += 1;
    if (aRelancer(d, maintenant)) c.relance += 1;
  }
  return c;
}
