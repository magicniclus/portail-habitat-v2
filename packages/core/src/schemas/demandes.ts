import { z } from '../zod';
import {
  centimes,
  centimesPositifs,
  codePostal,
  email,
  empreinte,
  geo,
  geohash,
  horodatage,
  id,
  meta,
  pourcent,
  schemaVersion,
  telephoneE164,
} from './commun';

const contact = z.object({
  prenom: z.string().min(1).max(80),
  nom: z.string().max(80),
  email,
  telephone: telephoneE164,
});

export const STATUTS_DEMANDE = [
  'nouvelle',
  'en_attribution',
  /** Aucun Premium disponible ou pas d'acceptation à temps : appel d'offres (MATCHING [7], D41). */
  'appel_offres',
  'attribuee',
  'devis_recus',
  'signee',
  'close',
  'annulee',
  'spam',
] as const;

/** `demandes/{id}` (DATABASE §4 et §4 bis). */
export const demande = z
  .object({
    ...meta,
    reference: z.string().regex(/^PH-[A-Z0-9]{6}$/),
    source: z.enum(['simulateur', 'hero', 'fiche_artisan', 'annuaire', 'partenaire']),
    partenaire: z
      .object({
        sourceId: id,
        idExterne: z.string(),
        recueLe: horodatage,
        coutAchatCentimes: centimesPositifs,
        /** Empreinte téléphone + prestation : doublons sur 30 jours (DATABASE §4 bis). */
        cleDoublon: empreinte.optional(),
        /** Lien de confirmation du téléphone envoyé par SMS (empreinte du jeton). */
        jetonTelephoneHash: empreinte.optional(),
      })
      .optional(),
    aides: z
      .object({
        eligibilite: z.enum(['eligible', 'ampleur_seulement', 'non_eligible']),
        trancheRevenus: z.enum(['bleu', 'jaune', 'violet', 'rose']).nullable(),
        montantEstimeCentimes: centimesPositifs,
        dispositifs: z.array(z.string()),
        mention: z.literal('indicatif'),
      })
      .optional(),
    qualification: z
      .object({
        telephoneVerifie: z.boolean(),
        statutOccupation: z.enum(['proprietaire_occupant', 'bailleur', 'locataire', 'inconnu']),
        horizon: z.enum(['moins_3_mois', '3_6_mois', 'plus_6_mois', 'renseignement']),
        score: pourcent,
        niveau: z.enum(['A', 'B', 'C']),
      })
      .optional(),
    rgeRequis: z.boolean().default(false),
    particulierUid: id.nullable(),
    contact,
    intention: id.optional(),
    prestationId: id,
    reponses: z.record(z.string(), z.union([z.number(), z.string(), z.array(z.string())])),
    reponsesLisibles: z.array(z.object({ question: z.string(), reponse: z.string() })),
    adresseChantier: z.object({ codePostal, ville: z.string(), geo, geohash }),
    acces: z.enum(['facile', 'etage', 'difficile']),
    delaiSouhaite: z.enum(['asap', '1mois', '3mois', 'renseignement']),
    precisions: z.string().max(2000).optional(),
    photos: z
      .array(z.object({ storagePath: z.string() }))
      .max(10)
      .default([]),
    estimation: z.object({
      minCentimes: centimesPositifs,
      maxCentimes: centimesPositifs,
      coefRegion: z.number().positive(),
      coefAcces: z.number().positive(),
      aidesCentimes: centimes,
      postes: z.array(
        z.object({ label: z.string(), min: centimesPositifs, max: centimesPositifs }),
      ),
      versionReferentiel: z.string(),
    }),
    miseEnRelation: z.boolean(),
    artisanCibleId: id.optional(),
    statut: z.enum(STATUTS_DEMANDE),
    nbAttributions: z.number().int().min(0).max(3),
    /** Matching (MATCHING [6]) : métier retenu, qualité, lead mis en modération, appel d'offres créé. */
    metierRequis: z.string().optional(),
    qualiteLead: pourcent.optional(),
    moderation: z.boolean().optional(),
    appelOffresId: id.optional(),
    /** Demande partenaire sans preneur : marquée à 24 h, archivée à 72 h (CONVERSION §3 bis). */
    invendueLe: horodatage.optional(),
    archiveeLe: horodatage.optional(),
    /** Contestations acceptées sur cette demande ; au-delà de 3, lead douteux (ADMIN §2.5). */
    contestationsAcceptees: z.number().int().nonnegative().optional(),
    douteux: z.boolean().optional(),
    consentementId: id,
    ipHash: empreinte.optional(),
    userAgent: z.string().max(400).optional(),
    expireLe: horodatage,
  })
  .refine((d) => d.estimation.minCentimes <= d.estimation.maxCentimes, {
    message: 'Fourchette inversée',
    path: ['estimation'],
  })
  .refine((d) => (d.source === 'partenaire') === Boolean(d.partenaire), {
    message: 'Bloc partenaire requis pour une demande partenaire',
    path: ['partenaire'],
  });

export const attribution = z.object({
  schemaVersion,
  /** Copie de l'identifiant du document : obligatoire pour les requêtes collection group. */
  artisanId: id,
  demandeId: id,
  assigneA: id.optional(),
  statut: z.enum([
    'proposee',
    'vue',
    'acceptee',
    'refusee',
    'devis_envoye',
    'devis_accepte',
    'devis_refuse',
    'expiree',
  ]),
  exclusive: z.boolean().default(false),
  /** Rang dans la sélection (1 = meilleur) et échéance de la proposition (MATCHING [6]). */
  rang: z.number().int().min(1).optional(),
  proposeeLe: horodatage,
  expireLe: horodatage.optional(),
  /** Demande partenaire : échéance normale, appliquée quand l'artisan ouvre la demande (2 h sinon). */
  expireLeSiVue: horodatage.optional(),
  vueLe: horodatage.optional(),
  reponduLe: horodatage.optional(),
  devis: z
    .object({ montantCentimes: centimesPositifs, storagePath: z.string(), envoyeLe: horodatage })
    .optional(),
  motifRefus: z.string().optional(),
  coordonneesDebloquees: z.boolean(),
  scoreMatching: pourcent,
  /** Attribution issue du déblocage d'un appel d'offres. */
  appelOffresId: id.optional(),
});

export const message = z.object({
  schemaVersion,
  auteurUid: id,
  auteurRole: z.enum(['particulier', 'artisan', 'admin']),
  artisanId: id,
  texte: z.string().min(1).max(4000),
  pieces: z
    .array(z.object({ storagePath: z.string(), nom: z.string() }))
    .max(5)
    .default([]),
  lu: z.boolean(),
  createdAt: horodatage,
});

/** `dossiersDiag/{id}` (DATABASE §6). */
export const dossierDiag = z.object({
  ...meta,
  reference: z.string().regex(/^PHD-[A-Z0-9]{6}$/),
  bien: z.object({
    adresse: z.string(),
    communeSlug: z.string(),
    codePostal,
    geo: geo.optional(),
    type: z.enum(['appartement', 'maison', 'immeuble']),
    periode: z.enum(['av1949', '1949-1976', '1977-1996', '1997-2010', 'ap2011']),
    surface: z.number().positive(),
    motif: z.enum(['vente', 'location', 'travaux']),
    gaz: z.boolean(),
    electricite: z.boolean(),
    assainissement: z.string(),
    classeDpe: z.string().optional(),
  }),
  existants: z.array(z.object({ diagId: id, annee: z.number().int().min(1900).max(2100) })),
  resultat: z.array(
    z.object({
      diagId: id,
      nom: z.string(),
      statut: z.enum(['a_realiser', 'a_refaire', 'deja_valide', 'conseille']),
      prixMin: centimesPositifs,
      prixMax: centimesPositifs,
      raison: z.string(),
    }),
  ),
  estimation: z.object({
    minCentimes: centimesPositifs,
    maxCentimes: centimesPositifs,
    remisePack: z.boolean(),
    versionRegles: z.string(),
  }),
  contact: z.object({
    nom: z.string(),
    email,
    telephone: telephoneE164,
    visiteSouhaitee: z.string().optional(),
  }),
  particulierUid: id.nullable(),
  statut: z.enum(STATUTS_DEMANDE),
  nbAttributions: z.number().int().min(0).max(3),
  consentementId: id,
  expireLe: horodatage,
});

/** `matching/{demandeId}` : trace explicable de chaque calcul. */
export const traceMatching = z.object({
  schemaVersion,
  demandeId: id,
  versionConfig: z.number().int(),
  resultat: z.enum(['attribuee', 'appel_offres', 'aucun_candidat', 'erreur']),
  candidats: z.array(
    z.object({
      artisanId: id,
      score: z.number(),
      exclu: z.string().optional(),
      retenu: z.boolean(),
    }),
  ),
  dureeMs: z.number().nonnegative(),
  createdAt: horodatage,
});

export const configMatching = z.object({
  schemaVersion,
  version: z.number().int().positive(),
  poids: z.record(z.string(), z.number()),
  seuils: z.record(z.string(), z.number()),
  modifiePar: id,
  updatedAt: horodatage,
});
