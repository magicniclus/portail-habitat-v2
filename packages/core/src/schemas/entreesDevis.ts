import { z } from '../zod';
import { centimesPositifs, id, jourIso, pourcent } from './commun';
import {
  clientDocument,
  ligneDevis,
  MOYENS_PAIEMENT,
  parametresFacturation,
  tauxTva,
} from './devis';

/**
 * Entrées des actions Devis & factures (DATABASE §8 bis). Totaux, marge, mentions et numéros ne
 * viennent jamais du navigateur : le serveur les recalcule (règle 3).
 */
export const entreeEnregistrerDevis = z.strictObject({
  devisId: id.optional(),
  client: clientDocument,
  typeClient: z.enum(['particulier', 'pro']),
  sirenClient: z.string().trim().max(20).optional(),
  horsEtablissement: z.boolean(),
  objet: z.string().trim().max(200),
  descriptionHtml: z.string().max(20_000),
  lignes: z.array(ligneDevis).max(200),
  remisePct: pourcent,
  acomptePct: pourcent,
  validiteLe: jourIso.optional(),
  debutTravauxLe: jourIso.optional(),
  dureeEstimee: z.string().trim().max(80),
  fraisDeplacement: z.string().trim().max(120),
  devisGratuit: z.boolean(),
  notes: z.string().max(2000),
  signatureElectronique: z.boolean(),
  tampon: z.boolean(),
  demandeId: id.optional(),
  modeleId: id.optional(),
});

export const entreeDevisCible = z.strictObject({ devisId: id });

export const entreeStatutDevis = z.strictObject({
  devisId: id,
  statut: z.enum(['accepte', 'refuse', 'archive']),
});

/** « Marquer expirés » : devis envoyés de la sélection. */
export const entreeExpirerDevis = z.strictObject({ ids: z.array(id).min(1).max(100) });

/** Bouton « Relancer » d'une facture. */
export const entreeRelancerFacture = z.strictObject({ factureId: id });

export const entreeFacturerDevis = z.strictObject({
  devisId: id,
  type: z.enum(['facture', 'acompte']),
  cleIdempotence: z.string().min(8).max(64),
});

export const entreePaiementFacture = z.strictObject({
  factureId: id,
  montantCentimes: centimesPositifs.min(1),
  moyen: z.enum(MOYENS_PAIEMENT),
  le: jourIso,
  ref: z.string().trim().max(80).optional(),
});

export const entreeAvoir = z.strictObject({
  factureId: id,
  motif: z.string().trim().min(3).max(300),
  cleIdempotence: z.string().min(8).max(64),
});

export const entreeParametresFacturation = parametresFacturation
  .omit({ schemaVersion: true, updatedAt: true })
  .strict();

export const entreePrestationBiblio = z.strictObject({
  prestationId: id.optional(),
  designation: z.string().trim().min(1).max(300),
  unite: z.string().trim().max(20),
  puHtCentimes: centimesPositifs,
  tva: tauxTva,
  coutHtCentimes: centimesPositifs.optional(),
});
