import { estSirenValide } from '../format/siren';
import { estLigneChiffree, TAUX_TVA, type LigneDevis } from './calcul';

/** `artisans/{id}/parametresFacturation` : ce que les mentions lisent. */
export interface ParametresFacturation {
  raisonSociale: string;
  formeJuridique?: string;
  capitalSocial?: string;
  adresseSiege: string;
  siret: string;
  rne?: string;
  tvaIntra?: string;
  franchiseTva: boolean;
  tvaSurDebits: boolean;
  assuranceDecennale?: { assureur: string; contrat: string; zone: string };
  mediateur?: { nom: string; adresse: string; site?: string };
  delaiPaiementJours: number;
}

interface Client {
  nom: string;
  adresse: string;
}

export interface DevisAVerifier {
  typeClient: 'particulier' | 'pro';
  sirenClient?: string;
  client: Client;
  validiteLe?: Date;
  debutTravauxLe?: Date;
  dureeEstimee?: string;
  fraisDeplacement?: string;
  horsEtablissement: boolean;
  lignes: readonly LigneDevis[];
}

export interface FactureAVerifier {
  typeClient: 'particulier' | 'pro';
  sirenClient?: string;
  client: Client;
  /** Adresse d'exécution, si différente de celle du client. */
  lieuExecution?: string;
  emiseLe?: Date;
  datePrestationLe?: Date;
  echeanceLe?: Date;
  lignes: readonly LigneDevis[];
}

export interface Mention {
  cle: string;
  libelle: string;
  ok: boolean;
}

export interface ResultatMentions {
  ok: boolean;
  liste: Mention[];
  /** Clés des mentions absentes, dans l'ordre de la liste : l'envoi est refusé. */
  manquantes: string[];
  /** Pièces jointes au PDF (DEV-03, DEV-04). */
  annexes: ('retractation' | 'attestation_tva_reduite')[];
}

const rempli = (s: string | undefined) => Boolean(s && s.trim());
const sirenOk = (s: string | undefined) => Boolean(s && estSirenValide(s.replace(/\s/g, '')));
const tauxReduit = (lignes: readonly LigneDevis[]) =>
  lignes.some((l) => estLigneChiffree(l) && l.tva !== TAUX_TVA[TAUX_TVA.length - 1]);

function identiteOk(p: ParametresFacturation): boolean {
  return rempli(p.raisonSociale) && rempli(p.adresseSiege) && rempli(p.siret);
}
const decennaleOk = (p: ParametresFacturation) =>
  Boolean(
    p.assuranceDecennale &&
    rempli(p.assuranceDecennale.assureur) &&
    rempli(p.assuranceDecennale.contrat) &&
    rempli(p.assuranceDecennale.zone),
  );
/** Au moins une ligne chiffrée ; chaque ligne a sa désignation, et un prix si elle est chiffrée. */
const lignesOk = (lignes: readonly LigneDevis[]) =>
  lignes.some(estLigneChiffree) &&
  lignes.every(
    (l) =>
      rempli(l.designation) && (!estLigneChiffree(l) || (l.quantite > 0 && l.puHtCentimes > 0)),
  );

function resultat(m: (Mention | null)[], annexes: ResultatMentions['annexes'] = []) {
  const liste = m.filter((x): x is Mention => x !== null);
  const manquantes = liste.filter((x) => !x.ok).map((x) => x.cle);
  return { ok: manquantes.length === 0, liste, manquantes, annexes };
}

/**
 * Mentions obligatoires d'un devis du bâtiment (DATABASE §8 ter). Même fonction à l'écran (liste
 * ✓ / !) et dans la Function d'envoi, qui refuse un devis incomplet (DEV-01, DEV-02).
 */
export function verifierMentionsDevis(
  d: DevisAVerifier,
  p: ParametresFacturation,
): ResultatMentions {
  const pro = d.typeClient === 'pro';
  const annexes: ResultatMentions['annexes'] = [];
  if (!pro && d.horsEtablissement) annexes.push('retractation');
  if (tauxReduit(d.lignes)) annexes.push('attestation_tva_reduite');
  return resultat(
    [
      { cle: 'identite', libelle: 'Identité de l’entreprise', ok: identiteOk(p) },
      { cle: 'assurance_decennale', libelle: 'Assurance décennale', ok: decennaleOk(p) },
      { cle: 'validite', libelle: 'Date et durée de validité', ok: Boolean(d.validiteLe) },
      {
        cle: 'client',
        libelle: 'Client et adresse du chantier',
        ok: rempli(d.client.nom) && rempli(d.client.adresse),
      },
      pro ? { cle: 'siren_client', libelle: 'SIREN du client', ok: sirenOk(d.sirenClient) } : null,
      { cle: 'lignes', libelle: 'Détail des prestations', ok: lignesOk(d.lignes) },
      { cle: 'totaux', libelle: 'Totaux HT, TVA et TTC', ok: true },
      {
        cle: 'debut_duree',
        libelle: 'Début et durée des travaux',
        ok: Boolean(d.debutTravauxLe) && rempli(d.dureeEstimee),
      },
      { cle: 'frais_deplacement', libelle: 'Frais de déplacement', ok: rempli(d.fraisDeplacement) },
      { cle: 'paiement', libelle: 'Conditions de paiement et pénalités', ok: true },
      { cle: 'gratuite', libelle: 'Devis gratuit ou payant', ok: true },
      pro
        ? null
        : {
            cle: 'mediateur',
            libelle: 'Médiateur de la consommation',
            ok: Boolean(p.mediateur && rempli(p.mediateur.nom) && rempli(p.mediateur.adresse)),
          },
      annexes.includes('retractation')
        ? { cle: 'retractation', libelle: 'Droit de rétractation de 14 jours', ok: true }
        : null,
      annexes.includes('attestation_tva_reduite')
        ? { cle: 'attestation_tva', libelle: 'Attestation TVA réduite', ok: true }
        : null,
      {
        cle: 'bon_pour_accord',
        libelle: '« Devis reçu avant l’exécution des travaux » et « Bon pour accord »',
        ok: true,
      },
    ],
    annexes,
  );
}

/**
 * Mentions obligatoires d'une facture, dont les 4 de la réforme (SIREN du client, lieu
 * d'exécution, nature de l'opération, option TVA sur les débits). DEV-07.
 */
export function verifierMentionsFacture(
  f: FactureAVerifier,
  p: ParametresFacturation,
): ResultatMentions {
  const pro = f.typeClient === 'pro';
  return resultat([
    { cle: 'identite', libelle: 'Identité de l’entreprise', ok: identiteOk(p) },
    { cle: 'assurance_decennale', libelle: 'Assurance décennale', ok: decennaleOk(p) },
    { cle: 'numero', libelle: 'Numéro chronologique sans trou', ok: true },
    {
      cle: 'dates',
      libelle: 'Dates d’émission et de prestation',
      ok: Boolean(f.emiseLe && f.datePrestationLe),
    },
    {
      cle: 'client',
      libelle: 'Client et adresse',
      ok: rempli(f.client.nom) && rempli(f.client.adresse),
    },
    pro ? { cle: 'siren_client', libelle: 'SIREN du client', ok: sirenOk(f.sirenClient) } : null,
    {
      cle: 'lieu_execution',
      libelle: 'Adresse d’exécution des travaux',
      ok: rempli(f.lieuExecution) || rempli(f.client.adresse),
    },
    {
      cle: 'nature_operation',
      libelle: 'Nature de l’opération : prestation de services',
      ok: true,
    },
    { cle: 'lignes', libelle: 'Détail des prestations', ok: lignesOk(f.lignes) },
    { cle: 'echeance', libelle: 'Date d’échéance', ok: Boolean(f.echeanceLe) },
    {
      cle: 'penalites',
      libelle: pro
        ? 'Pas d’escompte, pénalités de retard et indemnité de 40 €'
        : 'Pas d’escompte et pénalités de retard',
      ok: true,
    },
    p.tvaSurDebits
      ? {
          cle: 'tva_debits',
          libelle: 'Option pour le paiement de la TVA d’après les débits',
          ok: true,
        }
      : null,
  ]);
}
