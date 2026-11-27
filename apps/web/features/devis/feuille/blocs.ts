import { useState } from 'react';
import { TEXTE_CONDITIONS_DEFAUT, type EtatDevis } from '../etat';

/** Blocs de la feuille cochés dans le panneau Options (captures du propriétaire). */
export interface Blocs {
  livraison: boolean;
  tvaIntra: boolean;
  conditions: boolean;
  intitule: boolean;
  champLibre: boolean;
  remise: boolean;
  cout: boolean;
  /** Devis : date de début et durée (facultatives entre pros). */
  debut: boolean;
  frais: boolean;
}

/** Blocs affichés à l'ouverture : ceux qui ont déjà une valeur. */
const blocsInitiaux = (e: EtatDevis): Blocs => ({
  livraison: e.livraison !== undefined,
  tvaIntra: e.tvaIntraClient !== undefined,
  conditions: e.conditionsAcceptation !== undefined,
  intitule: e.intitule !== undefined,
  champLibre: e.champLibre !== undefined,
  remise: Number(e.remisePct.replace(',', '.')) > 0,
  cout: e.lignes.some((l) => l.cout),
  debut: Boolean(e.debutTravauxLe || e.dureeEstimee.trim()),
  frais: Boolean(e.fraisDeplacement.trim()),
});

/** Effet d'une case sur la saisie : décocher retire la valeur (rien d'imprimé). */
function effetBloc(cle: keyof Blocs, oui: boolean, e: EtatDevis): Partial<EtatDevis> {
  switch (cle) {
    case 'livraison':
      return { livraison: oui ? (e.livraison ?? {}) : undefined };
    case 'tvaIntra':
      return { tvaIntraClient: oui ? (e.tvaIntraClient ?? '') : undefined };
    case 'conditions':
      return {
        conditionsAcceptation: oui ? e.conditionsAcceptation || TEXTE_CONDITIONS_DEFAUT : undefined,
      };
    case 'intitule':
      return { intitule: oui ? (e.intitule ?? '') : undefined };
    case 'champLibre':
      return { champLibre: oui ? (e.champLibre ?? { titre: '', texte: '' }) : undefined };
    case 'remise':
      return oui ? {} : { remisePct: '0' };
    case 'cout':
      return {};
    case 'debut':
      return oui ? {} : { debutTravauxLe: '', dureeEstimee: '', libelleDebut: undefined };
    case 'frais':
      return oui ? {} : { fraisDeplacement: '' };
  }
}

/** Cases du panneau Options : l'état des blocs et leur effet sur la saisie. */
export function useBlocs(e: EtatDevis, maj: (patch: Partial<EtatDevis>) => void) {
  const [blocs, setBlocs] = useState(() => blocsInitiaux(e));
  const basculer = (cle: keyof Blocs, oui: boolean) => {
    setBlocs((b) => ({ ...b, [cle]: oui }));
    maj(effetBloc(cle, oui, e));
  };
  return { blocs, basculer };
}
