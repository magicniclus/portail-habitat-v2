import { ibanValide } from '../devis/iban';
import { z } from '../zod';
import { nomFichier } from './entreesPro';
import { centimesPositifs, id, jourIso, pourcent } from './commun';
import { NATURES_LIGNE } from '../devis/calcul';
import {
  clientDocument,
  ligneDevis,
  MOYENS_PAIEMENT,
  optionsDocument,
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
  ...optionsDocument,
});

export const entreeDevisCible = z.strictObject({ devisId: id });

export const entreeStatutDevis = z.strictObject({
  devisId: id,
  statut: z.enum(['accepte', 'refuse', 'archive']),
});

/**
 * Bibliothèque de prestations (onglet Modèles, ou « Enregistrer comme ligne type » dans l'éditeur) :
 * ligne chiffrée, ligne de texte seul, ou suppression.
 */
export const entreePrestationBiblio = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('creerTexte'),
    designation: z.string().trim().min(1).max(300),
  }),
  z.strictObject({
    action: z.literal('creer'),
    nature: z.enum(NATURES_LIGNE).optional(),
    designation: z.string().trim().min(1).max(300),
    unite: z.string().trim().min(1).max(20),
    puHtCentimes: centimesPositifs.min(1).max(100_000_000),
    tva: tauxTva,
    coutHtCentimes: centimesPositifs.max(100_000_000).optional(),
  }),
  z.strictObject({ action: z.literal('supprimer'), id }),
]);

/** Modèle de devis : créé depuis un devis (ses lignes), ou supprimé. */
export const entreeModeleDevis = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('depuisDevis'),
    devisId: id,
    titre: z.string().trim().min(1).max(120),
  }),
  z.strictObject({ action: z.literal('supprimer'), id }),
]);

/** « Marquer expirés » : devis envoyés de la sélection. */
export const entreeExpirerDevis = z.strictObject({ ids: z.array(id).min(1).max(100) });

/** Cachet ou logo des devis et factures : fichier déjà déposé dans Storage, ou retrait. */
export const entreeImageFacturation = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('enregistrer'),
    quoi: z.enum(['tampon', 'logo']),
    nomFichier,
  }),
  z.strictObject({ action: z.literal('retirer'), quoi: z.enum(['tampon', 'logo']) }),
]);

/** « Accepter ce devis » depuis le lien reçu par email (signature électronique simple). */
export const entreeSignatureDevis = z.strictObject({
  lien: z.string().regex(/^[\w-]{1,128}\.[\w-]{1,128}\.[\w-]{20,128}$/),
  nom: z.string().trim().min(2, 'Indiquez vos nom et prénom.').max(120),
  accord: z.literal(true, 'Cochez « Bon pour accord » pour accepter le devis.'),
});

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
  .omit({
    schemaVersion: true,
    updatedAt: true,
    ibanChiffre: true,
    ibanFin: true,
    tamponChemin: true,
    logoChemin: true,
  })
  .extend({
    /** Absent : IBAN inchangé ; vide : retiré ; sinon vérifié puis chiffré par le serveur. */
    iban: z
      .string()
      .trim()
      .max(42)
      .refine((v) => v === '' || ibanValide(v), 'IBAN invalide : vérifiez les chiffres.')
      .optional(),
  })
  .strict();
