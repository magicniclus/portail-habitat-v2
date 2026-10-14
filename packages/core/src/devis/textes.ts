import { formatDate, formatEuros } from '../format';
import type { ParametresFacturation } from './mentions';

/**
 * Textes légaux des PDF de devis et de factures (DATABASE §8 ter). Purs et testés : le gabarit PDF
 * ne fait que les dessiner.
 */
const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });
const pct = (n: number) => `${String(n).replace('.', ',')} %`;

export interface ContexteConditionsDevis {
  typeClient: 'particulier' | 'pro';
  horsEtablissement: boolean;
  tauxReduit: boolean;
  devisGratuit: boolean;
  validiteLe?: Date;
  debutTravauxLe?: Date;
  dureeEstimee: string;
  fraisDeplacement: string;
  acomptePct: number;
  acompteCentimes: number;
}

const penalites = (pro: boolean, p: { tauxPenalitesAnnuel?: number }) =>
  `En cas de retard de paiement : pénalités au taux annuel de ${pct(p.tauxPenalitesAnnuel ?? 12.15)}` +
  (pro
    ? ', et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce).'
    : '.');

const garanties =
  'Garanties : parfait achèvement (1 an), bon fonctionnement (2 ans), décennale (10 ans).';

export const TEXTE_TVA_REDUITE =
  'TVA à taux réduit : applicable sous réserve de l’attestation simplifiée signée par le client (jointe), pour un logement achevé depuis plus de 2 ans.';
export const TEXTE_RETRACTATION =
  'Droit de rétractation de 14 jours à compter de la signature (art. L221-18 du Code de la consommation) : formulaire de rétractation joint en annexe. Aucun paiement ne peut être exigé avant l’expiration d’un délai de 7 jours (art. L221-10).';
export const TEXTE_FRANCHISE = 'TVA non applicable, art. 293 B du CGI.';
export const TEXTE_BON_POUR_ACCORD =
  'Devis reçu avant l’exécution des travaux. Date, signature et mention manuscrite « Bon pour accord » :';

export function conditionsDevis(
  c: ContexteConditionsDevis,
  p: ParametresFacturation & { tauxPenalitesAnnuel?: number; conditionsPaiement?: string },
): string[] {
  const pro = c.typeClient === 'pro';
  const l = [
    `Devis ${c.devisGratuit ? 'gratuit' : 'payant (montant indiqué dans les lignes)'}${
      c.validiteLe ? `, valable jusqu’au ${formatDate(c.validiteLe)}` : ''
    }.`,
    `Début des travaux : ${c.debutTravauxLe ? formatDate(c.debutTravauxLe) : 'à convenir'} · durée estimée : ${
      c.dureeEstimee || 'à préciser'
    } · frais de déplacement : ${c.fraisDeplacement || 'inclus'}.`,
    c.acomptePct > 0
      ? `Acompte à la signature : ${pct(c.acomptePct)} (${eur(c.acompteCentimes)}), solde à réception de facture.`
      : 'Paiement à réception de facture.',
  ];
  if (p.conditionsPaiement) l.push(p.conditionsPaiement);
  l.push(penalites(pro, p));
  if (p.franchiseTva) l.push(TEXTE_FRANCHISE);
  if (!pro && p.mediateur)
    l.push(
      `Médiateur de la consommation : ${p.mediateur.nom}, ${p.mediateur.adresse}${
        p.mediateur.site ? ` (${p.mediateur.site})` : ''
      }.`,
    );
  if (!pro && c.horsEtablissement) l.push(TEXTE_RETRACTATION);
  if (c.tauxReduit && !p.franchiseTva) l.push(TEXTE_TVA_REDUITE);
  l.push(garanties);
  return l;
}

export interface ContexteConditionsFacture {
  typeClient: 'particulier' | 'pro';
  echeanceLe?: Date;
  devisNumero?: string;
  type: 'facture' | 'acompte' | 'avoir';
  factureOrigine?: string;
}

/** Conditions d'une facture, dont la nature de l'opération et l'option TVA sur les débits. */
export function conditionsFacture(
  c: ContexteConditionsFacture,
  p: ParametresFacturation & { tauxPenalitesAnnuel?: number; conditionsPaiement?: string },
): string[] {
  const pro = c.typeClient === 'pro';
  const l: string[] = [];
  if (c.type === 'avoir' && c.factureOrigine)
    l.push(`Avoir annulant la facture ${c.factureOrigine}.`);
  l.push('Nature de l’opération : prestation de services.');
  if (c.devisNumero) l.push(`Facture établie selon le devis ${c.devisNumero}.`);
  if (c.type !== 'avoir') {
    l.push(
      `Date d’échéance : ${c.echeanceLe ? formatDate(c.echeanceLe) : 'à réception'}.${
        p.conditionsPaiement ? ` ${p.conditionsPaiement}` : ''
      }`,
    );
    l.push('Pas d’escompte pour paiement anticipé.');
    l.push(penalites(pro, p));
  }
  if (p.tvaSurDebits) l.push('Option pour le paiement de la TVA d’après les débits.');
  if (p.franchiseTva) l.push(TEXTE_FRANCHISE);
  return l;
}

/** Annexe du devis signé au domicile du client (DEV-03), modèle de l'annexe à l'art. R221-1. */
export function formulaireRetractation(entreprise: {
  raisonSociale: string;
  adresseSiege: string;
}) {
  return {
    titre: 'Formulaire de rétractation',
    lignes: [
      'Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.',
      `À l’attention de ${entreprise.raisonSociale}, ${entreprise.adresseSiege} :`,
      'Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services ci-dessous :',
      'Commandé le : ............................',
      'Nom du consommateur : ............................',
      'Adresse du consommateur : ............................',
      'Signature du consommateur : ............................',
      'Date : ............................',
    ],
  };
}

/** Annexe d'un devis avec une ligne à 5,5 % ou 10 % (DEV-04), attestation simplifiée. */
export function attestationTvaReduite(client: { nom: string; adresse: string }) {
  return {
    titre: 'Attestation simplifiée de TVA à taux réduit',
    lignes: [
      `Je soussigné(e) ${client.nom}, demeurant ${client.adresse},`,
      'atteste que les travaux réalisés portent sur un local à usage d’habitation achevé depuis plus de deux ans,',
      'qu’ils n’aboutissent pas, sur une période de deux ans, à une remise à l’état neuf du gros œuvre ou à une augmentation de plus de 10 % de la surface de plancher,',
      'et, pour le taux de 5,5 %, qu’ils portent sur l’amélioration de la qualité énergétique du logement.',
      'Je conserve une copie de cette attestation et des factures jusqu’au 31 décembre de la cinquième année suivant les travaux.',
      'Fait à ............................ le ............................ Signature :',
    ],
  };
}
