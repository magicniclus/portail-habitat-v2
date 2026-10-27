import {
  calculerTotaux,
  texteAdresse,
  verifierMentionsFacture,
  type ParametresFacturation,
} from '@ph/core/devis';
import { lignesCentimes, type EtatDevis } from './etat';

const JOUR_MS = 86_400_000;

/** Totaux et mentions d'une facture en cours de saisie (mêmes fonctions que le serveur). */
export function calculsFacture(e: EtatDevis, p: ParametresFacturation, aujourdHui: number) {
  const lignes = lignesCentimes(e.lignes);
  const totaux = calculerTotaux(
    { lignes, remisePct: Number(e.remisePct.replace(',', '.')) || 0, acomptePct: 0 },
    { franchiseTva: p.franchiseTva },
  );
  const mentions = verifierMentionsFacture(
    {
      typeClient: e.typeClient,
      sirenClient: e.sirenClient,
      client: e.client,
      lieuExecution: e.livraison ? texteAdresse(e.livraison) || undefined : undefined,
      emiseLe: new Date(aujourdHui),
      datePrestationLe: e.datePrestationLe
        ? new Date(`${e.datePrestationLe}T12:00:00Z`)
        : undefined,
      echeanceLe: new Date(aujourdHui + p.delaiPaiementJours * JOUR_MS),
      lignes,
    },
    p,
  );
  return { totaux, mentions };
}
