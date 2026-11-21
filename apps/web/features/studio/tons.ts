import type { StatutProjetStudio } from '@ph/core/studio';
import type { Tone } from '@ph/ui';

/** Couleur du badge de chaque étape. */
export const TONS_STATUT: Readonly<Record<StatutProjetStudio, Tone>> = {
  sujet: 'neutre',
  enregistrement: 'info',
  transcription: 'attention',
  montage: 'attention',
  captures: 'attention',
  rendu: 'attention',
  pret: 'succes',
  erreur: 'danger',
};
