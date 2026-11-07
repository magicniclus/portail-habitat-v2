import { jourIso } from '../format/dates';

const JOUR_MS = 86_400_000;

/**
 * Relances automatiques des factures (maquette « Devis et Factures ») : 3 jours avant l'échéance,
 * le lendemain, puis 15 jours après. Envoyées au client de l'artisan, au plus une par jour.
 */
export const RELANCES_FACTURE = [
  { type: 'j-3', jours: -3 },
  { type: 'j+1', jours: 1 },
  { type: 'j+15', jours: 15 },
] as const;
export type RelanceFactureAuto = (typeof RELANCES_FACTURE)[number]['type'];
export type TypeRelanceFacture = RelanceFactureAuto | 'manuelle';

export const LIBELLES_RELANCE_FACTURE: Record<TypeRelanceFacture, string> = {
  'j-3': '3 jours avant l’échéance',
  'j+1': 'Lendemain de l’échéance',
  'j+15': '15 jours après l’échéance',
  manuelle: 'Relance manuelle',
};

/** Relance du client à J+7 après l'envoi d'un devis resté sans réponse (EMAILS §4.4). */
export const RELANCE_DEVIS_JOURS = 7;

const A_ENCAISSER = ['emise', 'partiellement_payee', 'impayee'];

export interface FactureARelancer {
  type: string;
  statut: string;
  resteCentimes: number;
  echeanceLe?: Date;
  avoirId?: string;
  relances: { le: Date; type: string }[];
}

/** Facture qui attend encore un paiement : émise, avec un reste dû, non annulée par un avoir. */
const enAttente = (f: FactureARelancer): f is FactureARelancer & { echeanceLe: Date } =>
  f.type !== 'avoir' &&
  !f.avoirId &&
  f.resteCentimes > 0 &&
  A_ENCAISSER.includes(f.statut) &&
  f.echeanceLe !== undefined;

const dejaRelanceeCeJour = (f: FactureARelancer, maintenant: number) =>
  f.relances.some((r) => jourIso(r.le) === jourIso(maintenant));

/**
 * Relance automatique due : la plus avancée des étapes atteintes, si elle n'est pas déjà partie
 * (une étape manquée n'est pas rattrapée). « J−3 » n'a plus de sens une fois l'échéance passée.
 */
export function relanceFactureDue(
  f: FactureARelancer,
  maintenant: number,
): RelanceFactureAuto | null {
  if (!enAttente(f) || dejaRelanceeCeJour(f, maintenant)) return null;
  const echeance = f.echeanceLe.getTime();
  const atteintes = RELANCES_FACTURE.filter((r) => echeance + r.jours * JOUR_MS <= maintenant);
  const etape = atteintes.at(-1);
  if (!etape || f.relances.some((r) => r.type === etape.type)) return null;
  if (etape.type === 'j-3' && maintenant >= echeance) return null;
  return etape.type;
}

/** Bouton « Relancer » : facture en attente de paiement, pas déjà relancée aujourd'hui. */
export const relanceManuellePossible = (f: FactureARelancer, maintenant: number): boolean =>
  enAttente(f) && !dejaRelanceeCeJour(f, maintenant);

/** Échéance dépassée avec un reste dû : la facture passe « impayée ». */
export const passeImpayee = (f: FactureARelancer, maintenant: number): boolean =>
  enAttente(f) && f.statut !== 'impayee' && f.echeanceLe.getTime() < maintenant;

interface DevisEnvoye {
  statut: string;
  envoiLe?: Date;
  validiteLe?: Date;
  relanceLe?: Date;
}

/** Devis envoyé dont la date de validité est passée : il devient « expiré ». */
export const devisAExpirer = (d: DevisEnvoye, maintenant: number): boolean =>
  d.statut === 'envoye' && d.validiteLe !== undefined && d.validiteLe.getTime() < maintenant;

/** Une seule relance du client, 7 jours après l'envoi, tant que le devis est encore valable. */
export const relanceDevisDue = (d: DevisEnvoye, maintenant: number): boolean =>
  d.statut === 'envoye' &&
  !d.relanceLe &&
  d.envoiLe !== undefined &&
  d.envoiLe.getTime() + RELANCE_DEVIS_JOURS * JOUR_MS <= maintenant &&
  !devisAExpirer(d, maintenant);
