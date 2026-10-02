import { z } from '../zod';
import { rayonKm, TYPES_DOCUMENT } from './artisans';
import { email, geo, id, telephoneFr } from './commun';

/** « Mes demandes » (PRO-02) : ouvrir, accepter ou refuser une demande reçue. */
export const entreeReponseDemande = z.strictObject({
  demandeId: id,
  action: z.enum(['voir', 'accepter', 'refuser']),
  motif: z.string().trim().max(300).optional(),
});

/** « Je m'en occupe » (PRO-03). */
export const entreePrendreDemande = z.strictObject({ demandeId: id });

/** Réponse publique de l'artisan à un avis (affichée sur sa fiche). */
export const entreeReponseAvis = z.strictObject({
  avisId: id,
  texte: z.string().trim().min(2, 'Écrivez votre réponse').max(1200),
});

/**
 * Ma fiche (maquette Ma Fiche) : chaque section s'enregistre seule. Chaîne vide = champ retiré.
 * Montants saisis en euros entiers, convertis en centimes par le serveur.
 */
export const entreeModifierFiche = z
  .strictObject({
    pitch: z.string().trim().max(280).optional(),
    description: z.string().trim().max(3000).optional(),
    telephonePublic: z.union([telephoneFr, z.literal('')]).optional(),
    emailContact: z.union([email, z.literal('')]).optional(),
    siteWeb: z.union([z.url({ protocol: /^https?$/ }), z.literal('')]).optional(),
    devis: z
      .strictObject({
        minEuros: z.number().int().min(0).max(10_000_000),
        maxEuros: z.number().int().min(0).max(10_000_000),
      })
      .refine((d) => d.minEuros <= d.maxEuros, {
        message: 'Le minimum dépasse le maximum.',
        path: ['maxEuros'],
      })
      .optional(),
    /** Centre (commune choisie dans la liste) et rayon ; le geohash est calculé par le serveur. */
    zone: z.strictObject({ centre: geo, rayonKm }).optional(),
  })
  .refine((e) => Object.keys(e).length > 0, 'Rien à enregistrer.');

/**
 * Document déposé (Kbis, décennale…) : le fichier est déjà dans Storage
 * (`artisans/{id}/documents/{docId}/{nomFichier}`) ; le serveur le vérifie avant de l'enregistrer.
 */
const nomFichier = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[^/\\]+$/, 'Nom de fichier invalide');
const idFichier = z.string().regex(/^[A-Za-z0-9]{20,32}$/);

export const entreeDocument = z.strictObject({
  docId: idFichier,
  type: z.enum(TYPES_DOCUMENT),
  nomFichier,
});

/** Logo déposé dans Storage (`artisans/{id}/logo/{nomFichier}`), public une fois enregistré. */
export const entreeLogo = z.strictObject({ nomFichier });

/**
 * Réalisation (photos déjà dans `artisans/{id}/realisations/{rid}/`) : publiée seulement avec
 * l'autorisation du propriétaire du chantier (CGV §9).
 */
export const entreeRealisation = z.strictObject({
  rid: idFichier,
  titre: z.string().trim().min(2, 'Donnez un titre au chantier').max(120),
  ville: z.string().trim().min(2).max(80),
  description: z.string().trim().max(2000).default(''),
  photos: z
    .array(
      z.strictObject({
        nomFichier,
        largeur: z.number().int().min(1).max(20_000),
        hauteur: z.number().int().min(1).max(20_000),
      }),
    )
    .min(1, 'Ajoutez au moins une photo')
    .max(20),
  autorisationProprietaire: z.literal(true, "Confirmez l'accord du propriétaire du chantier"),
});

export const entreeSupprimerRealisation = z.strictObject({ rid: idFichier });

const canauxNotif = z.strictObject({ email: z.boolean(), sms: z.boolean(), inapp: z.boolean() });

/** Mon compte : profil (chaîne vide = téléphone retiré). */
export const entreeProfilPro = z.strictObject({
  prenom: z.string().trim().min(1, 'Indiquez votre prénom').max(80),
  nom: z.string().trim().min(1, 'Indiquez votre nom').max(80),
  telephone: z.union([telephoneFr, z.literal('')]).optional(),
});

/** Mon compte : changement de l'email de connexion (lien de confirmation à la nouvelle adresse). */
export const entreeChangerEmail = z.strictObject({ email });

/** Mon compte : notifications personnelles et, si une entreprise est active, celles de l'entreprise. */
export const entreeNotifsPro = z.strictObject({
  preferences: z.strictObject({
    activite: canauxNotif,
    relance: canauxNotif,
    offres_pro: canauxNotif,
    marketing: canauxNotif,
  }),
  entreprise: z
    .strictObject({ demandes: z.boolean(), avis: z.boolean(), factures: z.boolean() })
    .optional(),
});

/** Notifications push de cet appareil (jeton FCM) : activées ou retirées. */
export const entreePush = z.strictObject({
  jeton: z.string().min(20).max(4096),
  actif: z.boolean(),
});

/** Paiement d'un abonnement (Checkout) : formule et facturation choisies sur la page de paiement. */
export const entreeCheckout = z.strictObject({
  produit: z.enum(['premium', 'visibilite']),
  periode: z.enum(['annuel', 'mensuel']),
});

/** Déblocage d'un appel d'offres : crédits d'abord (`auto`), ou paiement par carte (PRO-05). */
export const entreeDebloquerAppelOffres = z.strictObject({
  appelOffresId: id,
  choix: z.enum(['auto', 'carte']),
});

/** Achat d'un pack de crédits (Checkout, paiement unique). */
export const entreeAchatPack = z.strictObject({
  cle: z.enum(['pack_10', 'pack_25', 'pack_50']),
});

/** Back-office : afficher une donnée personnelle masquée (consultation journalisée, ADM-02). */
export const entreeAfficherDonnee = z.strictObject({
  cible: z.string().regex(/^[a-zA-Z]+\/[\w-]+$/),
  champ: z
    .string()
    .regex(/^[\w.]+$/)
    .max(60),
});

/** Back-office : « Voir en tant que » un compte, en lecture seule (ADM-04). */
export const entreeVoirEnTantQue = z.strictObject({
  uid: id,
  motif: z.string().trim().min(5).max(500),
});

const motifAdmin = z.string().trim().min(5).max(500);

/** Back-office › Artisans : vérifier, suspendre ou lever, créditer (motif obligatoire, ADM-03). */
export const entreeActionArtisanAdmin = z.strictObject({
  artisanId: id,
  action: z.enum(['verifier', 'suspendre', 'lever']),
  motif: motifAdmin,
});
export const entreeCrediterAdmin = z.strictObject({
  artisanId: id,
  credits: z.number().int().min(1).max(100),
  motif: motifAdmin,
});
