import { formatEuros } from '@ph/core/format';
import { alerte, bouton, note, para, recap, sousTitre, titre } from '../blocs';
import { bonjour, modele } from '../modele';
import {
  code,
  EX_BASE,
  ht,
  lignes,
  parMois,
  PRIX,
  stats,
  surtitre,
  type BaseConversion,
} from './conversionOutils';

/** EMAILS §4.7, CONVERSION §3 : Visibilité → Premium, fidélisation, rétention, reconquête. */

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

const premiumAn = ht(parMois(PRIX.premiumAn));
const premiumMois = ht(PRIX.premiumMois);
const avantagesPremium = recap([
  ['Demandes exclusives', '4 par mois', true],
  ['Garantie', 'Sinon le 2e mois est offert'],
  ['Crédits appels d’offres', '5 par mois inclus'],
  ['Appels d’offres', 'Vous les voyez en premier'],
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
    sujet: (d) => `Votre 1er mois en Visibilité : ${d.vues} vues`,
    sujetB: (d) => `${d.appels} appels ce mois-ci grâce à la Visibilité`,
    preheader: (d) => `${d.vues} vues, ${d.appels} appels. Voici l’étape suivante.`,
    blocs: (d) => [
      surtitre('Bilan du mois'),
      titre('Visibilité fonctionne : voici vos chiffres'),
      stats([
        [String(d.vues), d.multiplicateur ?? '', 'Vues de votre fiche'],
        [String(d.appels), '', 'Appels depuis votre fiche'],
        [String(d.demandes), '', 'Demandes reçues'],
      ]),
      sousTitre('L’étape suivante : des demandes garanties'),
      para(
        'Avec Premium, nous vous transmettons 4 demandes exclusives par mois : vous êtes le seul artisan contacté.',
      ),
      avantagesPremium,
      ...(d.deductionCentimes
        ? [
            alerte(
              `Vos mois de Visibilité restants (${ht(d.deductionCentimes)}) sont déduits de votre abonnement Premium.`,
              'ok',
            ),
          ]
        : []),
      bouton('Découvrir Premium', d.lien),
      note(
        `Premium : ${premiumAn} / mois payé à l’année, ou ${premiumMois} / mois sans engagement.`,
      ),
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
      `${d.demandes.length} chantiers (${formatEuros(d.demandes.reduce((n, x) => n + x.budgetCentimes, 0))}) partis en exclusivité`.slice(
        0,
        59,
      ),
    preheader: () => 'Ils ont été confiés à un seul artisan Premium de votre secteur.',
    blocs: (d) => [
      surtitre(d.semaine),
      titre(`${d.demandes.length} demandes exclusives que vous n’avez pas reçues`),
      lignes(
        d.demandes.map((x) => [
          `${x.travaux} · ${x.ville}`,
          'Exclusive',
          'warn',
          formatEuros(x.budgetCentimes),
        ]),
      ),
      para(
        'Ces demandes n’ont été transmises qu’à un seul artisan, abonné Premium : aucun concurrent face à lui.',
      ),
      bouton('Recevoir mes 4 demandes exclusives', d.lien),
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
    preheader: () => 'Avec Premium, 5 crédits par mois sont inclus.',
    blocs: (d) => [
      titre('Premium serait déjà rentable pour vous'),
      recap([
        ['Crédits achetés sur 30 jours', `${d.credits30j} crédits · ${ht(d.montant30jCentimes)}`],
        ['Inclus chaque mois en Premium', '5 crédits', true],
        ['En plus', '4 demandes exclusives garanties'],
      ]),
      para(
        'Vous répondez souvent aux appels d’offres. En Premium, vous les voyez avant les autres artisans, et 5 crédits sont inclus chaque mois.',
      ),
      bouton('Passer Premium', d.lien),
      note('Crédits inclus non reportables. Vos crédits déjà achetés restent valables.'),
    ],
    exemple: { ...EX_BASE, credits30j: 6, montant30jCentimes: 6000 },
  }),
  'prem-appel-offres-complet': modele<AppelComplet>({
    sujet: () => 'Cet appel d’offres était complet avant votre résumé',
    preheader: (d) => `${d.travaux} à ${d.ville} : 3 réponses reçues avant 7 h.`.slice(0, 120),
    blocs: (d) => [
      titre('Les artisans Premium l’ont vu en premier'),
      para(
        `L’appel d’offres « ${d.travaux} » à ${d.ville} a reçu ses 3 réponses avant l’envoi de votre résumé du matin.`,
      ),
      para(
        'En Premium, vous voyez les appels d’offres dès leur publication, et 5 crédits sont inclus chaque mois.',
      ),
      bouton('Passer Premium', d.lien),
    ],
    exemple: { ...EX_BASE, travaux: 'Rénovation de salle de bain' },
  }),
  'prem-renouvellement': modele<Renouvellement>({
    sujet: () => 'Renouvelez directement en Premium',
    preheader: (d) => `Votre Visibilité se renouvelle le ${d.date}.`,
    blocs: (d) => [
      titre('Votre renouvellement approche'),
      para(
        `${bonjour(d.prenom)}votre Visibilité se renouvelle le ${d.date}. C’est le meilleur moment pour passer en Premium : vous ne payez pas deux fois.`,
      ),
      avantagesPremium,
      bouton('Renouveler en Premium', d.lien),
      note('Sans action de votre part, votre Visibilité est renouvelée normalement.'),
    ],
    exemple: { ...EX_BASE, date: '1er novembre 2026' },
  }),
  'passage-annuel': modele<BaseConversion>({
    sujet: () =>
      `Économisez ${formatEuros(PRIX.premiumMois * 12 - PRIX.premiumAn)} en passant Premium à l’année`.slice(
        0,
        59,
      ),
    preheader: () => `${premiumAn} / mois au lieu de ${premiumMois}. Le mois en cours est déduit.`,
    blocs: (d) => [
      titre('Premium depuis 3 mois : passez à l’année'),
      recap([
        ['Aujourd’hui (mensuel)', `${premiumMois} / mois`],
        ['À l’année', `${premiumAn} / mois`, true],
        ['Payé en une fois', ht(PRIX.premiumAn)],
        ['Économie', `${ht(PRIX.premiumMois * 12 - PRIX.premiumAn)} par an`, true],
      ]),
      para(
        'Mêmes avantages, même garantie de 4 demandes exclusives par mois. Le mois en cours est déduit au prorata.',
      ),
      bouton('Passer à l’année', d.lien),
      note(
        `En Visibilité : ${ht(PRIX.visibiliteAn)} par an au lieu de ${ht(PRIX.visibiliteMois * 12)}.`,
      ),
    ],
    exemple: EX_BASE,
  }),
  'garantie-tenue': modele<Garantie>({
    sujet: (d) => `Votre ${d.demandesMois}e demande garantie du mois est arrivée`,
    preheader: () => 'La garantie Premium est tenue ce mois-ci.',
    blocs: (d) => [
      titre('Garantie tenue'),
      para(
        `${bonjour(d.prenom)}vous avez reçu ${d.demandesMois} demandes exclusives ce mois-ci : la garantie Premium est tenue.`,
      ),
      bouton('Voir mes demandes', d.lien),
    ],
    exemple: { ...EX_BASE, demandesMois: 4, lien: 'https://portailhabitat.fr/pro/demandes' },
  }),
  'resiliation-alternative': modele<Resiliation>({
    sujet: (d) => `Avant le ${d.finLe} : gardez l’essentiel pour moins cher`.slice(0, 59),
    preheader: () => 'Passez en Visibilité ou suspendez 2 mois au lieu de tout perdre.',
    blocs: (d) => [
      titre(`Votre ${d.produit === 'premium' ? 'Premium' : 'Visibilité'} s’arrête le ${d.finLe}`),
      para('Votre résiliation est bien enregistrée. D’ici là, trois options s’offrent à vous :'),
      lignes([
        ...(d.produit === 'premium'
          ? [
              [
                'Passer en Visibilité',
                'Rester en tête de liste',
                'ok',
                `${ht(parMois(PRIX.visibiliteAn))} / mois`,
              ] as [string, string, 'ok', string],
            ]
          : []),
        ['Suspendre 2 mois', 'Reprise automatique', 'info', '0 €'],
        [
          'Rester abonné',
          '−50 % pendant 2 mois',
          'warn',
          ht(Math.round((d.produit === 'premium' ? PRIX.premiumMois : PRIX.visibiliteMois) / 2)),
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
      `${d.prenom ? `${d.prenom}, ` : ''}${d.demandesExclusives} demandes exclusives sont parties depuis`.slice(
        0,
        59,
      ),
    preheader: () => 'Revenez en Premium avec −30 % sur votre premier mois.',
    blocs: (d) => [
      titre('Votre secteur a continué sans vous'),
      stats([
        [String(d.demandesExclusives), '', 'Demandes exclusives confiées à d’autres'],
        [String(d.recherches), '', `Recherches « ${d.metier} ${d.ville} »`],
        [`${d.position}e`, '', 'Position de votre fiche'],
      ]),
      para(
        'Vos avis sont toujours là. Reprenez Premium et retrouvez votre place et vos demandes garanties dès aujourd’hui.',
      ),
      code(d.code),
      bouton('Reprendre Premium à −30 %', d.lien),
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
        'Vous avez quitté Premium il y a 3 mois. Je voudrais simplement comprendre ce qui n’a pas fonctionné pour vous : trop cher, pas assez de demandes, autre chose ?',
      ),
      para(
        'Répondez à cet email en une ligne, c’est moi qui lis les réponses. Ce sera mon dernier message : ensuite, vous ne recevrez plus que le rapport mensuel gratuit.',
      ),
      para(`${d.signataire}, Portail Habitat`),
    ],
    exemple: { ...EX_BASE, signataire: 'Julie' },
  }),
};
