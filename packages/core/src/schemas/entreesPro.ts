import { FLAGS, type NomFlag } from '../flags';
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

/** Back-office › File de travail : prendre, rendre ou clore une tâche. */
export const entreeTacheAdmin = z.strictObject({
  id,
  action: z.enum(['prendre', 'rendre', 'traiter', 'rejeter']),
  resolution: z.string().trim().max(1000).optional(),
});

/** Back-office › Artisans › Documents : valider (date de fin lue sur le document) ou refuser. */
export const entreeDocumentAdmin = z.strictObject({
  artisanId: id,
  documentId: id,
  decision: z.enum(['valide', 'refuse']),
  valideAu: z.iso.date().optional(),
  motif: motifAdmin,
});

/** Back-office : note interne sur une fiche (jamais visible de l'artisan). */
export const entreeNoteAdmin = z.strictObject({
  artisanId: id,
  texte: z.string().trim().min(2).max(4000),
});

/** Back-office › Demandes : spam, annulation, relance de l'algorithme, ajout d'un artisan. */
export const entreeDemandeAdmin = z.strictObject({
  demandeId: id,
  action: z.enum(['spam', 'annuler', 'relancer']),
  motif: motifAdmin,
});
export const entreeAjoutArtisanAdmin = z.strictObject({
  demandeId: id,
  artisanId: id,
  motif: motifAdmin,
});

/** Back-office › Appels d'offres : éditeur de prix (ADMIN §2.5). Montants en euros entiers. */
const euros = z.number().int().min(0).max(10_000);
export const entreePrixAppelOffres = z.discriminatedUnion('mode', [
  z.strictObject({
    appelOffresId: id,
    mode: z.literal('manuel'),
    prixEuros: euros,
    prixPremiumEuros: euros,
    credits: z.number().int().min(0).max(1000),
    motif: motifAdmin,
  }),
  z.strictObject({ appelOffresId: id, mode: z.enum(['auto', 'gratuit']), motif: motifAdmin }),
]);
/** Promo en pourcentage jusqu'à une date ; sans pourcentage, la promo est retirée. */
export const entreePromoAppelOffres = z.strictObject({
  appelOffresId: id,
  pourcentage: z.number().int().min(1).max(90).optional(),
  jusquau: z.iso.date().optional(),
  motif: motifAdmin,
});
export const entreeParametresAppelOffres = z.strictObject({
  appelOffresId: id,
  nbDeblocagesMax: z.number().int().min(1).max(3),
  acces: z.enum(['tous', 'premium_seul', 'premium_prioritaire']),
  motif: motifAdmin,
});

/** Back-office › Barèmes : saisie en euros entiers et pourcentages (ADMIN §2.5, ADM-05). */
const coefBareme = z.number().positive().max(5);
const eurosBareme = z.number().int().min(1).max(1000);
export const entreeBaremeAdmin = z
  .strictObject({
    prixBaseParMetier: z.record(z.string().regex(/^[a-z0-9-]{2,40}$/), eurosBareme),
    prixBaseDefaut: eurosBareme,
    coefBudget: z.strictObject({ S: coefBareme, M: coefBareme, L: coefBareme, XL: coefBareme }),
    coefUrgence: z.strictObject({
      normale: coefBareme,
      rapide: coefBareme,
      urgente: coefBareme,
    }),
    remisePremiumPourcent: z.number().int().min(0).max(90),
    eurosParCredit: z.number().int().min(1).max(100),
    plancher: eurosBareme,
    plafond: eurosBareme,
  })
  .refine((b) => b.plancher <= b.plafond, {
    message: 'Le plancher dépasse le plafond.',
    path: ['plafond'],
  });
export const entreePublierBaremeAdmin = z.strictObject({
  bareme: entreeBaremeAdmin,
  motif: motifAdmin,
});

/** Espace pro : contester un appel d'offres débloqué (7 jours, DATABASE §5). */
export const entreeContestation = z.strictObject({
  appelOffresId: id,
  motif: z.enum([
    'faux_numero',
    'projet_inexistant',
    'hors_zone',
    'doublon',
    'deja_realise',
    'autre',
  ]),
  details: z.string().trim().min(10, 'Expliquez en quelques mots').max(2000),
});

/** Back-office : décision sur une contestation (crédits, carte ou refus, motif obligatoire). */
export const entreeDecisionContestation = z.strictObject({
  id,
  decision: z.enum(['credits', 'carte', 'refuser']),
  motif: motifAdmin,
});

/** Back-office › Sources partenaires : couper ou rouvrir une source (motif obligatoire). */
export const entreeSourceAdmin = z.strictObject({
  sourceId: id,
  actif: z.boolean(),
  motif: motifAdmin,
});

/** Back-office › Avis : décision sans modification du texte (ADMIN §2.6). */
export const entreeModererAvis = z.strictObject({
  avisId: id,
  action: z.enum(['publier', 'refuser', 'preuve', 'suspendre', 'supprimer']),
  motif: motifAdmin,
  motifRefus: z
    .enum([
      'Sans lien avec une prestation',
      'Propos injurieux ou diffamatoires',
      'Conflit d’intérêts',
      'Doublon',
    ])
    .optional(),
});

/** Back-office › Litiges : message du médiateur, décision (ADMIN §2.7). */
export const entreeMessageLitige = z.strictObject({
  id,
  texte: z.string().trim().min(5).max(2000),
});
export const entreeDecisionLitige = z.strictObject({
  id,
  issue: z.enum(['resolu', 'clos']),
  sanction: z.enum(['rappel', 'avertissement']).optional(),
  motif: motifAdmin,
});

/** Back-office › Algorithme : poids en pourcentages (total 100), seuils, options (ADMIN §2.10). */
const pourcentPoids = z.number().int().min(0).max(100);
const seuilMatching = z.number().int().min(0).max(1000);
export const entreeConfigMatching = z
  .strictObject({
    poids: z.strictObject({
      competence: pourcentPoids,
      distance: pourcentPoids,
      qualite: pourcentPoids,
      reactivite: pourcentPoids,
      disponibilite: pourcentPoids,
      adequationBudget: pourcentPoids,
      completude: pourcentPoids,
    }),
    seuils: z.strictObject({
      nbCibles: z.number().int().min(1).max(10),
      nbPropositionsInitiales: z.number().int().min(1).max(10),
      vagueSupplementaire: z.number().int().min(0).max(10),
      delaiAcceptationH: z.number().int().min(1).max(168),
      delaiAcceptationUrgentH: z.number().int().min(1).max(48),
      rayonMaxKm: z.number().int().min(10).max(100),
      bonusPremium: seuilMatching,
      bonusVisibilite: seuilMatching,
      quotaPremiumMax: z.number().int().min(0).max(10),
      scoreMin: z.number().int().min(0).max(100),
      delaiAvantAppelOffresH: z.number().int().min(1).max(168),
    }),
    options: z.strictObject({
      garantirUnNonPremium: z.boolean(),
      convertirEnAppelOffres: z.boolean(),
    }),
  })
  .refine((c) => Object.values(c.poids).reduce((a, b) => a + b, 0) === 100, {
    message: 'Le total des poids doit faire 100.',
    path: ['poids'],
  });
export const entreePublierConfigMatching = z.strictObject({
  config: entreeConfigMatching,
  motif: motifAdmin,
});
export const entreeRejouerDemande = z.strictObject({
  config: entreeConfigMatching,
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^PH-[A-Z0-9]{4,8}$/, 'Référence PH-… attendue'),
});

/** Back-office › Référentiels : prix d'une prestation, mise en ligne, feature flags (ADMIN §2.9). */
export const entreePrixPrestation = z.strictObject({
  id,
  modifs: z.record(z.string().regex(/^[\w.]{1,120}$/), z.number().nonnegative().max(10_000_000)),
  motif: motifAdmin,
});
export const entreeActiverPrestation = z.strictObject({
  id,
  actif: z.boolean(),
  motif: motifAdmin,
});
export const entreeFlagAdmin = z.strictObject({
  nom: z.enum(Object.keys(FLAGS) as [NomFlag, ...NomFlag[]]),
  valeur: z.boolean(),
  motif: motifAdmin,
});
