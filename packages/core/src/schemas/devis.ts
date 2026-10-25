import { NATURES_LIGNE, TAUX_TVA, TYPES_LIGNE } from '../devis/calcul';
import { MODES_SAISIE } from '../devis/libelles';
import { z } from '../zod';
import {
  centimes,
  centimesPositifs,
  empreinte,
  horodatage,
  id,
  meta,
  pourcent,
  schemaVersion,
} from './commun';

/** Devis et factures des artisans (DATABASE §8 bis), gratuits pour toutes les formules. */
export const STATUTS_DEVIS = [
  'brouillon',
  'envoye',
  'accepte',
  'refuse',
  'expire',
  'archive',
] as const;
export const STATUTS_FACTURE = [
  'brouillon',
  'emise',
  'partiellement_payee',
  'payee',
  'impayee',
] as const;
export const TYPES_FACTURE = ['facture', 'acompte', 'avoir'] as const;
export const MOYENS_PAIEMENT = ['virement', 'cheque', 'especes', 'carte'] as const;

export const tauxTva = z.union(
  TAUX_TVA.map((t) => z.literal(t)) as [z.ZodLiteral<5.5>, z.ZodLiteral<10>, z.ZodLiteral<20>],
);

export const ligneDevis = z.object({
  /** Absent : ligne chiffrée. Une ligne de texte n'a ni quantité ni prix (0) et reste hors totaux. */
  type: z.enum(TYPES_LIGNE).optional(),
  nature: z.enum(NATURES_LIGNE).optional(),
  designation: z.string().trim().max(300),
  quantite: z.number().min(0).max(1_000_000),
  unite: z.string().trim().max(20),
  puHtCentimes: centimesPositifs.max(100_000_000),
  tva: tauxTva,
  coutHtCentimes: centimesPositifs.max(100_000_000).optional(),
});

export const clientDocument = z.object({
  nom: z.string().trim().max(120),
  email: z.string().trim().max(200).optional(),
  tel: z.string().trim().max(30).optional(),
  adresse: z.string().trim().max(300),
  complement: z.string().trim().max(200).optional(),
  codePostal: z.string().trim().max(10).optional(),
  ville: z.string().trim().max(120).optional(),
  pays: z.string().trim().max(60).optional(),
});

/** Options de l'éditeur A4 (devis et factures), toutes facultatives. */
export const optionsDocument = {
  /** Rapide : désignation, TVA, montant ; complet (défaut) : quantité, unité, prix unitaire. */
  modeSaisie: z.enum(MODES_SAISIE).optional(),
  /** Adresse de livraison ou du chantier, si différente de celle du client. */
  adresseChantier: z.string().trim().max(300).optional(),
  tvaIntraClient: z.string().trim().max(20).optional(),
  /** Intitulé du document (« Devis » par défaut, « Proposition commerciale »…). */
  intitule: z.string().trim().max(60).optional(),
  conditionsAcceptation: z.string().trim().max(1000).optional(),
  /** Cadre « Bon pour accord » avec date et signature sur le PDF. */
  champSignature: z.boolean().optional(),
  champLibre: z
    .object({ titre: z.string().trim().max(80), texte: z.string().trim().max(1000) })
    .optional(),
};

export const totauxDocument = z.object({
  htBrutCentimes: centimes,
  remiseCentimes: centimes,
  htCentimes: centimes,
  tva: z.record(z.string(), centimes),
  ttcCentimes: centimes,
  acompteCentimes: centimes,
});

const typeClient = z.enum(['particulier', 'pro']);

/** `artisans/{id}/devis/{devisId}` : totaux, marge et mentions calculés côté serveur. */
export const devis = z.object({
  ...meta,
  numero: z
    .string()
    .regex(/^D-\d{4}-\d{4,}$/)
    .optional(),
  statut: z.enum(STATUTS_DEVIS),
  client: clientDocument,
  demandeId: id.optional(),
  modeleId: id.optional(),
  objet: z.string().max(200),
  descriptionHtml: z.string().max(20_000),
  typeClient,
  sirenClient: z.string().max(20).optional(),
  horsEtablissement: z.boolean(),
  debutTravauxLe: horodatage.optional(),
  dureeEstimee: z.string().max(80),
  fraisDeplacement: z.string().max(120),
  devisGratuit: z.boolean(),
  lignes: z.array(ligneDevis).max(200),
  remisePct: pourcent,
  acomptePct: pourcent,
  ...optionsDocument,
  totaux: totauxDocument,
  /** Privé : jamais dans le PDF. */
  margeHtCentimes: centimes,
  mentionsOk: z.boolean(),
  mentionsManquantes: z.array(z.string()),
  validiteLe: horodatage.optional(),
  /** Relance du client à J+7 déjà partie (une seule). */
  relanceLe: horodatage.optional(),
  notes: z.string().max(2000),
  signatureElectronique: z.boolean(),
  tampon: z.boolean(),
  envoiLe: horodatage.optional(),
  signature: z
    .object({
      nom: z.string().max(120),
      ip: z.string().max(64),
      le: horodatage,
      hashPdf: empreinte,
    })
    .optional(),
  pdfPath: z.string().max(300).optional(),
  hashPdf: empreinte.optional(),
  /** Empreinte du lien envoyé au client (téléchargement du PDF) ; le jeton n'est jamais stocké. */
  jetonHash: empreinte.optional(),
  factureId: id.optional(),
  creePar: id,
});

/** `artisans/{id}/facturesClients/{id}` : émise = figée, correction par avoir. */
export const factureClient = z.object({
  ...meta,
  numero: z
    .string()
    .regex(/^F-\d{4}-\d{4,}$/)
    .optional(),
  devisId: id.optional(),
  devisNumero: z.string().max(30).optional(),
  factureOrigineId: id.optional(),
  type: z.enum(TYPES_FACTURE),
  statut: z.enum(STATUTS_FACTURE),
  client: clientDocument,
  typeClient,
  sirenClient: z.string().max(20).optional(),
  lieuExecution: z.string().max(300).optional(),
  objet: z.string().max(200),
  lignes: z.array(ligneDevis).max(200),
  remisePct: pourcent,
  ...optionsDocument,
  totaux: totauxDocument,
  datePrestationLe: horodatage.optional(),
  echeanceLe: horodatage.optional(),
  paiements: z
    .array(
      z.object({
        montantCentimes: centimesPositifs,
        moyen: z.enum(MOYENS_PAIEMENT),
        le: horodatage,
        ref: z.string().max(80).optional(),
      }),
    )
    .max(100),
  /** Facture de solde : acomptes déjà facturés, déduits du reste à payer. */
  acomptesDeduits: z
    .array(z.object({ factureId: id, numero: z.string().max(30), ttcCentimes: centimes }))
    .max(20)
    .optional(),
  /** Avoir émis pour corriger cette facture. */
  avoirId: id.optional(),
  motifAvoir: z.string().max(300).optional(),
  resteCentimes: centimes,
  penalites: z.object({ tauxAnnuel: z.number().min(0).max(100), indemnite: z.literal(4000) }),
  relances: z.array(z.object({ le: horodatage, type: z.string().max(40) })).max(50),
  pdfPath: z.string().max(300).optional(),
  hashPdf: empreinte.optional(),
  /** Empreinte du dernier lien de téléchargement envoyé au client (relances) ; le jeton n'est jamais stocké. */
  jetonHash: empreinte.optional(),
  emiseLe: horodatage.optional(),
  creePar: id,
});

export const modeleDevis = z.object({
  ...meta,
  titre: z.string().trim().min(1).max(120),
  lignes: z.array(ligneDevis).max(100),
  usage: z.number().int().nonnegative(),
});

export const prestationBiblio = z.object({
  ...meta,
  /** Ligne type : chiffrée (défaut) ou texte seul (titre ou précision réutilisable). */
  type: z.enum(TYPES_LIGNE).optional(),
  nature: z.enum(NATURES_LIGNE).optional(),
  designation: z.string().trim().min(1).max(300),
  unite: z.string().trim().max(20),
  puHtCentimes: centimesPositifs,
  tva: tauxTva,
  coutHtCentimes: centimesPositifs.optional(),
});

/** `artisans/{id}/parametresFacturation/actuels` (document unique). */
export const parametresFacturation = z.object({
  schemaVersion,
  raisonSociale: z.string().trim().max(200),
  formeJuridique: z.string().trim().max(80).optional(),
  capitalSocial: z.string().trim().max(40).optional(),
  adresseSiege: z.string().trim().max(300),
  siret: z.string().trim().max(20),
  rne: z.string().trim().max(40).optional(),
  tvaIntra: z.string().trim().max(20).optional(),
  franchiseTva: z.boolean(),
  tvaSurDebits: z.boolean(),
  assuranceDecennale: z
    .object({
      assureur: z.string().trim().max(120),
      contrat: z.string().trim().max(60),
      zone: z.string().trim().max(120),
    })
    .optional(),
  rcPro: z.string().trim().max(200).optional(),
  mediateur: z
    .object({
      nom: z.string().trim().max(120),
      adresse: z.string().trim().max(300),
      site: z.string().trim().max(200).optional(),
    })
    .optional(),
  conditionsPaiement: z.string().trim().max(400).optional(),
  delaiPaiementJours: z.number().int().min(0).max(60),
  acompteDefautPct: pourcent,
  validiteDevisJours: z.number().int().min(1).max(365),
  tvaDefaut: tauxTva,
  tauxPenalitesAnnuel: z.number().min(0).max(100),
  /** IBAN chiffré (AES-256-GCM, clé hors base) : jamais renvoyé au navigateur. */
  ibanChiffre: z.string().max(400).optional(),
  /** 4 derniers caractères de l'IBAN, seuls affichés dans l'espace pro. */
  ibanFin: z.string().max(4).optional(),
  /** Chemin Storage du cachet de l'entreprise (privé), posé sur les devis et factures. */
  tamponChemin: z.string().max(300).optional(),
  /** Chemin Storage du logo propre aux devis et factures (sinon celui de « Ma fiche »). */
  logoChemin: z.string().max(300).optional(),
  updatedAt: horodatage,
});

/** `artisans/{id}/compteurs/{devis|factures}` : un compteur par année, écrit en transaction. */
export const compteurDocuments = z.object({
  schemaVersion,
  annee: z.number().int().min(2020).max(2100),
  dernier: z.number().int().nonnegative(),
  updatedAt: horodatage,
});
