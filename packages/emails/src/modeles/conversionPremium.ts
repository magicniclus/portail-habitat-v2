import { formatEuros } from '@ph/core/format';
import { alerte, bouton, note, para, recap, sousTitre, titre } from '../blocs';
import { bonjour, modele } from '../modele';
import {
  code,
  EX_BASE,
  ht,
  lignes,
  PRIX,
  stats,
  surtitre,
  type BaseConversion,
} from './conversionOutils';

/**
 * EMAILS §4.7, CONVERSION §3 : Fiche Pro → Tout inclus, fidélisation, rétention, reconquête (les
 * étapes « Visibilité » et « Premium » du moteur vendent ces formules, D60). Aucune demande garantie
 * ni crédit inclus n'est promis : ils n'existent plus (PAIEMENTS §2).
 */

interface Bilan extends BaseConversion {
  vues: number;
  multiplicateur?: string;
  appels: number;
  demandes: number;
  deductionCentimes?: number;
}
interface Manquees extends BaseConversion {
  semaine: string;
  demandes: { travaux: string; ville: string; budgetCentimes: number }[];
}
interface Credits extends BaseConversion {
  credits30j: number;
  montant30jCentimes: number;
}
interface AppelComplet extends BaseConversion {
  travaux: string;
}
interface Renouvellement extends BaseConversion {
  date: string;
}
interface Garantie extends BaseConversion {
  demandesMois: number;
}
interface Resiliation extends BaseConversion {
  produit: 'premium' | 'visibilite';
  finLe: string;
  nbAvis: number;
}
interface Reconquete extends BaseConversion {
  demandesExclusives: number;
  recherches: number;
  position: number;
  code: string;
  expire: string;
}
interface Humain extends BaseConversion {
  signataire: string;
}

const toutMois = ht(PRIX.toutInclus);
const avantagesPremium = recap([
  ['Appels d’offres', '12 h avant les autres artisans', true],
  ['Prix des appels d’offres', '−15 %'],
  ['Site internet', 'Site Pro inclus, avec votre domaine'],
  ['Support', 'Prioritaire'],
]);
const EX_RECONQUETE: Reconquete = {
  ...EX_BASE,
  demandesExclusives: 11,
  recherches: 164,
  position: 18,
  code: 'RETOUR30',
  expire: '3 octobre 2026',
};

export const modelesConversionPremium = {
  'prem-bilan-visibilite': modele<Bilan>({
    sujet: (d) => `Votre 1er mois en Fiche Pro : ${d.vues} vues`,
    sujetB: (d) => `${d.appels} appels ce mois-ci grâce à Fiche Pro`,
    preheader: (d) => `${d.vues} vues, ${d.appels} appels. Voici l’étape suivante.`,
    blocs: (d) => [
      surtitre('Bilan du mois'),
      titre('Fiche Pro fonctionne : voici vos chiffres'),
      stats([
        [String(d.vues), d.multiplicateur ?? '', 'Vues de votre fiche'],
        [String(d.appels), '', 'Appels depuis votre fiche'],
        [String(d.demandes), '', 'Demandes reçues'],
      ]),
      sousTitre('L’étape suivante : Tout inclus'),
      para(
        'Avec Tout inclus, vous voyez les appels d’offres de votre zone 12 h avant les autres artisans, vous les payez 15 % moins cher, et votre site internet est inclus.',
      ),
      avantagesPremium,
      ...(d.deductionCentimes
        ? [
            alerte(
              `Le reste de votre mois de Fiche Pro (${ht(d.deductionCentimes)}) est déduit au prorata.`,
              'ok',
            ),
          ]
        : []),
      bouton('Découvrir Tout inclus', d.lien),
      note(`Tout inclus : ${toutMois} / mois, sans engagement.`),
    ],
    exemple: {
      ...EX_BASE,
      vues: 287,
      multiplicateur: '×4,1',
      appels: 19,
      demandes: 3,
      deductionCentimes: 7324,
    },
  }),
  'prem-demandes-manquees': modele<Manquees>({
    sujet: (d) =>
      `${d.demandes.length} chantiers (${formatEuros(d.demandes.reduce((n, x) => n + x.budgetCentimes, 0))}) demandés à d’autres artisans`.slice(
        0,
        59,
      ),
    preheader: () => 'Des particuliers de votre secteur ont contacté un artisan depuis sa fiche.',
    blocs: (d) => [
      surtitre(d.semaine),
      titre(`${d.demandes.length} demandes envoyées à d’autres artisans de votre secteur`),
      lignes(
        d.demandes.map((x) => [
          `${x.travaux} · ${x.ville}`,
          'Depuis une fiche',
          'warn',
          formatEuros(x.budgetCentimes),
        ]),
      ),
      para(
        'Ces particuliers ont choisi un artisan depuis sa fiche et lui ont écrit directement. Avec Fiche Pro, la vôtre passe en tête de votre secteur, avec votre téléphone affiché.',
      ),
      bouton('Mettre ma fiche en avant', d.lien),
      note('Budgets estimés TTC. Aucune donnée du particulier n’est communiquée.'),
    ],
    exemple: {
      ...EX_BASE,
      semaine: 'Semaine du 21 au 27 septembre',
      demandes: [
        { travaux: 'Salle de bain', ville: 'Caudéran', budgetCentimes: 980_000 },
        { travaux: 'Chaudière vers PAC', ville: 'Talence', budgetCentimes: 840_000 },
        { travaux: 'Ballon d’eau chaude', ville: 'Bègles', budgetCentimes: 330_000 },
      ],
    },
  }),
  'prem-credits': modele<Credits>({
    sujet: (d) =>
      `Vous avez payé ${formatEuros(d.montant30jCentimes)} d’appels d’offres ce mois-ci`.slice(
        0,
        59,
      ),
    preheader: () => 'Avec Tout inclus, vos appels d’offres coûtent 15 % moins cher.',
    blocs: (d) => [
      titre('Tout inclus pourrait vous faire économiser'),
      recap([
        ['Appels d’offres sur 30 jours', `${d.credits30j} crédits · ${ht(d.montant30jCentimes)}`],
        ['Avec Tout inclus', '−15 % sur chaque appel d’offres', true],
        ['En plus', 'Accès 12 h avant les autres artisans'],
      ]),
      para(
        'Vous répondez souvent aux appels d’offres. En Tout inclus, vous les voyez 12 h avant les autres artisans et vous les payez 15 % moins cher.',
      ),
      bouton('Découvrir Tout inclus', d.lien),
      note('Vos crédits déjà achetés restent valables.'),
    ],
    exemple: { ...EX_BASE, credits30j: 6, montant30jCentimes: 6000 },
  }),
  'prem-appel-offres-complet': modele<AppelComplet>({
    sujet: () => 'Cet appel d’offres était complet avant votre résumé',
    preheader: (d) => `${d.travaux} à ${d.ville} : 3 réponses reçues avant 7 h.`.slice(0, 120),
    blocs: (d) => [
      titre('Les artisans Tout inclus l’ont vu en premier'),
      para(
        `L’appel d’offres « ${d.travaux} » à ${d.ville} a reçu ses 3 réponses avant l’envoi de votre résumé du matin.`,
      ),
      para(
        'En Tout inclus, vous voyez les appels d’offres 12 h avant les autres artisans, et vous les payez 15 % moins cher.',
      ),
      bouton('Découvrir Tout inclus', d.lien),
    ],
    exemple: { ...EX_BASE, travaux: 'Rénovation de salle de bain' },
  }),
  'prem-renouvellement': modele<Renouvellement>({
    sujet: () => 'Passez à Tout inclus avant votre échéance',
    preheader: (d) => `Votre Fiche Pro se renouvelle le ${d.date}.`,
    blocs: (d) => [
      titre('Votre échéance approche'),
      para(
        `${bonjour(d.prenom)}votre Fiche Pro se renouvelle le ${d.date}. En passant à Tout inclus maintenant, seule la différence est facturée au prorata.`,
      ),
      avantagesPremium,
      bouton('Découvrir Tout inclus', d.lien),
      note('Sans action de votre part, votre Fiche Pro continue normalement.'),
    ],
    exemple: { ...EX_BASE, date: '1er novembre 2026' },
  }),
  'passage-annuel': modele<BaseConversion>({
    // Plus envoyé : aucune formule annuelle (PAIEMENTS §2). Modèle gardé pour l'historique des envois.
    sujet: () => 'Votre abonnement Portail Habitat',
    preheader: () => `Tout inclus : ${toutMois} / mois, sans engagement.`,
    blocs: (d) => [
      titre('Votre abonnement'),
      para('Toutes les formules sont mensuelles et sans engagement.'),
      bouton('Voir mon abonnement', d.lien),
    ],
    exemple: EX_BASE,
  }),
  'garantie-tenue': modele<Garantie>({
    // Plus envoyé : les demandes garanties n'existent plus (PAIEMENTS §2).
    sujet: (d) => `${d.demandesMois} demandes reçues ce mois-ci`,
    preheader: () => 'Le point sur vos demandes du mois.',
    blocs: (d) => [
      titre('Vos demandes du mois'),
      para(`${bonjour(d.prenom)}vous avez reçu ${d.demandesMois} demandes ce mois-ci.`),
      bouton('Voir mes demandes', d.lien),
    ],
    exemple: { ...EX_BASE, demandesMois: 4, lien: 'https://portailhabitat.fr/pro/demandes' },
  }),
  'resiliation-alternative': modele<Resiliation>({
    sujet: (d) => `Avant le ${d.finLe} : gardez l’essentiel pour moins cher`.slice(0, 59),
    preheader: () => 'Passez à Fiche Pro ou suspendez 2 mois au lieu de tout perdre.',
    blocs: (d) => [
      titre(
        `Votre ${d.produit === 'premium' ? 'Tout inclus' : 'Fiche Pro'} s’arrête le ${d.finLe}`,
      ),
      para('Votre résiliation est bien enregistrée. D’ici là, trois options s’offrent à vous :'),
      lignes([
        ...(d.produit === 'premium'
          ? [
              [
                'Passer à Fiche Pro',
                'Rester en tête de liste',
                'ok',
                `${ht(PRIX.fichePro)} / mois`,
              ] as [string, string, 'ok', string],
            ]
          : []),
        ['Suspendre 2 mois', 'Reprise automatique', 'info', '0 €'],
        [
          'Rester abonné',
          '−50 % pendant 2 mois',
          'warn',
          ht(Math.round((d.produit === 'premium' ? PRIX.toutInclus : PRIX.fichePro) / 2)),
        ],
      ]),
      alerte(
        `Le ${d.finLe}, votre fiche repassera en gratuit. ${d.nbAvis ? `Vos ${d.nbAvis} avis sont conservés.` : 'Votre fiche et ses informations sont conservées.'}`,
        'warn',
      ),
      bouton('Choisir une option', d.lien),
      note('Vous n’avez rien à faire pour confirmer la résiliation.'),
    ],
    exemple: { ...EX_BASE, produit: 'premium', finLe: '24 octobre', nbAvis: 87 },
  }),
  'reconquete-1': modele<Reconquete>({
    sujet: (d) =>
      `${d.prenom ? `${d.prenom}, ` : ''}${d.demandesExclusives} demandes sont parties ailleurs depuis`.slice(
        0,
        59,
      ),
    preheader: () => 'Revenez avec −30 % sur votre premier mois.',
    blocs: (d) => [
      titre('Votre secteur a continué sans vous'),
      stats([
        [String(d.demandesExclusives), '', 'Demandes envoyées à d’autres artisans'],
        [String(d.recherches), '', `Recherches « ${d.metier} ${d.ville} »`],
        [`${d.position}e`, '', 'Position de votre fiche'],
      ]),
      para(
        'Vos avis sont toujours là. Reprenez votre formule et retrouvez votre place en tête de votre secteur dès aujourd’hui.',
      ),
      code(d.code),
      bouton('Revenir à −30 %', d.lien),
      note(`Code personnel valable jusqu’au ${d.expire}, appliqué au premier mois.`),
    ],
    exemple: EX_RECONQUETE,
  }),
  'reconquete-2': modele<Humain>({
    sujet: () => 'Une dernière question',
    preheader: () => 'Je ne vous écrirai plus après celui-ci.',
    blocs: (d) => [
      para(bonjour(d.prenom).trim()),
      para(
        'Vous avez quitté votre abonnement il y a 3 mois. Je voudrais simplement comprendre ce qui n’a pas fonctionné pour vous : trop cher, pas assez de demandes, autre chose ?',
      ),
      para(
        'Répondez à cet email en une ligne, c’est moi qui lis les réponses. Ce sera mon dernier message : ensuite, vous ne recevrez plus que le rapport mensuel gratuit.',
      ),
      para(`${d.signataire}, Portail Habitat`),
    ],
    exemple: { ...EX_BASE, signataire: 'Julie' },
  }),
};
