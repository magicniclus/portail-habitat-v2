import { ECHANTILLONS_DEFAUT } from '@ph/core/comportement';
import type { ResumeVisite } from '@ph/core/schemas';
import { demarrer, EVENEMENT_CONVERSION } from './dom';

/**
 * Traceur de comportement des pages publiques (COMPORTEMENT §2) : démarre seulement avec le
 * consentement « Mesure d'audience détaillée » et hors Do Not Track / Global Privacy Control,
 * tient un résumé en mémoire et l'envoie une fois par page vue.
 */
export type OptionsTraceur = {
  page: string;
  app: ResumeVisite['app'];
  variante?: string;
  /** Lit le consentement en vigueur (relu à chaque événement `ph:consentement`). */
  consentement: () => boolean;
  endpoint?: string;
  echantillon?: number;
  echantillonTrajets?: number;
  echantillonReplay?: number;
};

const EVENEMENT_CONSENTEMENT = 'ph:consentement';

/** Objectif atteint (inscription commencée, demande envoyée, paiement) : relie la visite au résultat. */
export function signalerConversion(objectif: NonNullable<ResumeVisite['conversion']>) {
  window.dispatchEvent(new CustomEvent(EVENEMENT_CONVERSION, { detail: objectif }));
}

/** Lance le traceur ; la fonction rendue l'arrête et envoie le résumé (changement de page). */
export function initTracker(o: OptionsTraceur): () => void {
  if (Math.random() >= (o.echantillon ?? ECHANTILLONS_DEFAUT.visites)) return () => {};
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  let arreter: ((envoyer: boolean) => void) | undefined;
  const verifier = () => {
    const accord = o.consentement() && nav.doNotTrack !== '1' && nav.globalPrivacyControl !== true;
    if (accord && !arreter) arreter = demarrer(o);
    else if (!accord && arreter) {
      // Consentement retiré : on jette le résumé, rien n'est envoyé.
      arreter(false);
      arreter = undefined;
    }
  };
  addEventListener(EVENEMENT_CONSENTEMENT, verifier);
  verifier();
  return () => {
    removeEventListener(EVENEMENT_CONSENTEMENT, verifier);
    arreter?.(true);
    arreter = undefined;
  };
}
