import { formatEuros } from '@ph/core/format';
import { alerte, bouton, note, para, recap, titre } from '../blocs';
import { bonjour, modele } from '../modele';
import {
  code,
  EX_BASE,
  fourchette,
  ht,
  lien,
  lignes,
  parMois,
  PRIX,
  stats,
  surtitre,
  type BaseConversion,
} from './conversionOutils';

/**
 * EMAILS §4.7, CONVERSION §3 : prospects et Gratuit → Visibilité (catégorie offres_pro).
 * Chiffres réels de la zone et du métier ; sans chiffre, le moteur n'envoie pas (`encoreValable`).
 */

interface Estimation extends BaseConversion {
  demandes30j: number;
  /** Absent sans demande réelle du métier dans le département. */
  budgetMoyenCentimes?: number;
  inscritsZone: number;
}
interface DemandeZone extends BaseConversion {
  travaux: string;
  budgetMinCentimes: number;
  budgetMaxCentimes: number;
  distanceKm: number;
  delai: string;
}
interface Temoignage extends BaseConversion {
  joursPremiereDemande: number;
  demandes30j: number;
}
interface Humain extends BaseConversion {
  signataire: string;
  nouvellesDemandes?: number;
}
interface ResumeZone extends BaseConversion {
  mois: string;
  demandes: number;
  budgetMoyenCentimes: number;
}
interface Position extends BaseConversion {
  vues7j: number;
  position: number;
  total: number;
  vuesMisesEnAvant: number;
  offre: 'visibilite' | 'premium';
}
interface Concurrents extends BaseConversion {
  misesEnAvant: number;
  position: number;
  total: number;
  recul: number;
  recherches30j: number;
}
interface Recherches extends BaseConversion {
  recherches7j: number;
}
interface Offre extends BaseConversion {
  code: string;
  pourcentage: number;
  /** Date et heure de fin, déjà en clair (« jeudi 1er octobre à 23 h 59 »). */
  expire: string;
}

const EX_ESTIMATION: Estimation = {
  ...EX_BASE,
  prenom: 'Marc',
  metier: 'électricien',
  ville: 'Lormont',
  demandes30j: 27,
  budgetMoyenCentimes: 640_000,
  inscritsZone: 4,
  lien: 'https://portailhabitat.fr/pro/inscription',
};
const EX_DEMANDE: DemandeZone = {
  ...EX_ESTIMATION,
  travaux: 'Remplacement du tableau et mise aux normes',
  budgetMinCentimes: 240_000,
  budgetMaxCentimes: 320_000,
  distanceKm: 3,
  delai: 'Sous 2 semaines',
};
const EX_OFFRE: Offre = {
  ...EX_BASE,
  code: 'JULIEN30',
  pourcentage: 30,
  expire: 'jeudi 1er octobre à 23 h 59',
  lien: 'https://portailhabitat.fr/pro/abonnement/visibilite?facturation=annuel&code=JULIEN30',
};

const visMois = ht(parMois(PRIX.visibiliteAn));
const offreVisibilite = recap([
  ['Visibilité à l’année', `${visMois} / mois`, true],
  ['Payé en une fois', `${ht(PRIX.visibiliteAn)} pour 12 mois`],
  ['Sans engagement', `${ht(PRIX.visibiliteMois)} / mois`],
]);
const remise = (c: number, p: number) => Math.round((c * (100 - p)) / 100);
const offreRemisee = (d: Offre) => [
  recap([
    ['Prix normal', `${ht(PRIX.visibiliteAn)} / an`],
    ['Avec votre code', `${ht(remise(PRIX.visibiliteAn, d.pourcentage))} / an`, true],
    ['Soit', `${ht(parMois(remise(PRIX.visibiliteAn, d.pourcentage)))} / mois`],
  ]),
  code(d.code),
  alerte(`Valable jusqu’au ${d.expire}. Le code est déjà appliqué via le bouton.`),
];

export const modelesConversion = {
  'prospect-estimation': modele<Estimation>({
    sujet: (d) =>
      `${d.metier[0]!.toUpperCase()}${d.metier.slice(1)} à ${d.ville} : ${d.demandes30j} demandes ce mois-ci`.slice(
        0,
        59,
      ),
    preheader: () => 'Votre estimation détaillée, et comment recevoir ces demandes gratuitement.',
    blocs: (d) => [
      surtitre('Votre estimation'),
      titre(`${d.demandes30j} particuliers cherchent un ${d.metier} autour de ${d.ville}`),
      stats([
        [String(d.demandes30j), '30 jours', 'Demandes dans votre métier'],
        ...(d.budgetMoyenCentimes
          ? [
              [formatEuros(d.budgetMoyenCentimes), '', 'Budget moyen par projet'] as [
                string,
                string,
                string,
              ],
            ]
          : []),
        [
          String(d.inscritsZone),
          '',
          `${d.metier[0]!.toUpperCase()}${d.metier.slice(1)}s inscrits à 20 km`,
        ],
      ]),
      para(
        d.inscritsZone
          ? `Ces demandes sont aujourd’hui partagées entre seulement ${d.inscritsZone} ${d.metier}s. L’inscription est gratuite et prend 3 minutes : SIREN, zone, métiers.`
          : `Aucun ${d.metier} n’est encore inscrit à 20 km : les premiers inscrits reçoivent ces demandes. L’inscription est gratuite et prend 3 minutes : SIREN, zone, métiers.`,
      ),
      bouton('Recevoir mes premières demandes', d.lien),
      note(
        'Gratuit, sans engagement, sans carte bancaire. Chiffres calculés sur les demandes réellement reçues par Portail Habitat.',
      ),
    ],
    exemple: EX_ESTIMATION,
  }),
  'prospect-demande-zone': modele<DemandeZone>({
    sujet: (d) =>
      `Hier à ${d.ville} : ${fourchette(d.budgetMinCentimes, d.budgetMaxCentimes)}`.slice(0, 59),
    preheader: (d) => `Cette demande est partie chez un autre ${d.metier}. Recevez les suivantes.`,
    blocs: (d) => [
      surtitre('Demande reçue hier'),
      titre(`Un particulier de ${d.ville} cherchait un ${d.metier}`),
      recap([
        ['Travaux', d.travaux],
        ['Budget estimé', fourchette(d.budgetMinCentimes, d.budgetMaxCentimes), true],
        ['Distance', `${d.distanceKm} km de votre siège`],
        ['Délai souhaité', d.delai],
      ]),
      alerte(
        `Faute de ${d.metier} inscrit près de chez vous, elle a été transmise à une autre entreprise.`,
        'warn',
      ),
      para(
        'Inscrivez-vous gratuitement : les prochaines demandes de ce type vous arriveront par email et par SMS.',
      ),
      bouton('M’inscrire gratuitement', d.lien),
      note('Aucune donnée personnelle du particulier n’est communiquée dans cet email.'),
    ],
    exemple: EX_DEMANDE,
  }),
  'prospect-temoignage': modele<Temoignage>({
    sujet: (d) =>
      `Un ${d.metier} inscrit reçoit sa 1re demande en ${d.joursPremiereDemande} jours`.slice(
        0,
        59,
      ),
    preheader: (d) => `${d.demandes30j} demandes de ${d.metier} ce mois-ci autour de ${d.ville}.`,
    blocs: (d) => [
      titre('Combien de temps avant la première demande ?'),
      stats([
        [`${d.joursPremiereDemande} j`, 'en moyenne', 'Avant la 1re demande'],
        [String(d.demandes30j), '30 jours', `Demandes autour de ${d.ville}`],
      ]),
      para(
        `${bonjour(d.prenom)}les ${d.metier}s qui s’inscrivent dans votre secteur reçoivent leur première demande en ${d.joursPremiereDemande} jours en moyenne, sans payer.`,
      ),
      bouton('Créer ma fiche gratuite', d.lien),
      note(
        'Moyenne calculée sur les artisans inscrits depuis moins de 6 mois dans votre département.',
      ),
    ],
    exemple: { ...EX_ESTIMATION, joursPremiereDemande: 6 },
  }),
  'prospect-derniere': modele<Humain>({
    sujet: () => 'Je clôture votre dossier ?',
    preheader: (d) =>
      `Une question avant de ne plus vous écrire${d.prenom ? `, ${d.prenom}` : ''}.`,
    blocs: (d) => [
      para(`${bonjour(d.prenom).trim().replace(/,$/, ',')}`),
      para(
        `Je vous ai envoyé il y a 12 jours l’estimation des demandes autour de ${d.ville}.${d.nouvellesDemandes ? ` Depuis, ${d.nouvellesDemandes} nouvelles demandes sont arrivées dans votre secteur.` : ''}`,
      ),
      para(
        'Je ne veux pas vous encombrer : si ce n’est pas le moment, je clôture votre dossier et vous ne recevrez plus qu’un résumé mensuel de votre zone.',
      ),
      para(
        'Une question sur le fonctionnement, les prix ou l’engagement ? Répondez simplement à cet email, c’est moi qui lis les réponses.',
      ),
      lien('Créer ma fiche gratuite en 3 minutes →', d.lien),
      para(`${d.signataire}, Portail Habitat`),
    ],
    exemple: { ...EX_ESTIMATION, signataire: 'Julie', nouvellesDemandes: 9 },
  }),
  'resume-zone-mensuel': modele<ResumeZone>({
    sujet: (d) =>
      `${d.mois} : ${d.demandes} demandes de ${d.metier} près de ${d.ville}`.slice(0, 59),
    preheader: () => 'Le résumé mensuel de votre zone.',
    blocs: (d) => [
      surtitre(`Résumé de ${d.mois}`),
      titre(`${d.demandes} demandes dans votre métier autour de ${d.ville}`),
      stats([
        [String(d.demandes), '', 'Demandes'],
        [formatEuros(d.budgetMoyenCentimes), '', 'Budget moyen'],
      ]),
      bouton('Voir comment les recevoir', d.lien),
      note('Vous recevez ce résumé une fois par mois. Désabonnement en un clic ci-dessous.'),
    ],
    exemple: {
      ...EX_ESTIMATION,
      budgetMoyenCentimes: 640_000,
      mois: 'Septembre',
      demandes: 27,
    },
  }),
  'vis-position': modele<Position>({
    sujet: (d) => `Vous êtes ${d.position}e sur ${d.total} ${d.metier}s à ${d.ville}`.slice(0, 59),
    sujetB: (d) => `${d.vues7j} vues cette semaine : et les fiches en tête ?`.slice(0, 59),
    preheader: (d) =>
      `Votre fiche a été vue ${d.vues7j} fois. Les fiches mises en avant, bien plus.`,
    blocs: (d) => [
      surtitre('Votre première semaine'),
      titre('Votre fiche est en ligne, mais pas en tête'),
      stats([
        [String(d.vues7j), '', 'Vues de votre fiche'],
        [`${d.position}e`, `sur ${d.total}`, `Votre position à ${d.ville}`],
        [String(d.vuesMisesEnAvant), '', 'Vues moyennes d’une fiche mise en avant'],
      ]),
      ...(d.offre === 'premium'
        ? [
            para(
              'Les particuliers contactent d’abord les artisans qu’ils voient en premier. Avec Premium, vous passez en tête et recevez en plus 4 demandes exclusives par mois, garanties.',
            ),
            recap([
              ['Premium à l’année', `${ht(parMois(PRIX.premiumAn))} / mois`, true],
              ['Garantie', '4 demandes exclusives par mois, sinon le 2e mois est offert'],
            ]),
            bouton('Découvrir Premium', d.lien),
          ]
        : [
            para(
              'Les particuliers contactent d’abord les artisans qu’ils voient en premier. Avec Visibilité, votre fiche passe en tête de votre secteur, avec votre téléphone affiché et un badge.',
            ),
            offreVisibilite,
            bouton('Passer en tête de mon secteur', d.lien),
          ]),
      note('Activation immédiate, résiliable depuis votre espace.'),
    ],
    exemple: {
      ...EX_BASE,
      vues7j: 31,
      position: 14,
      total: 22,
      vuesMisesEnAvant: 312,
      offre: 'visibilite',
    },
  }),
  'vis-concurrents': modele<Concurrents>({
    sujet: (d) => `Un ${d.misesEnAvant}e ${d.metier} est affiché avant vous`.slice(0, 59),
    preheader: (d) => `Votre fiche passe à la ${d.position}e place à ${d.ville}.`,
    blocs: (d) => [
      titre('Votre fiche recule dans votre secteur'),
      lignes([
        ['Fiches mises en avant', '+1 cette semaine', 'warn', String(d.misesEnAvant)],
        ['Votre position', `−${d.recul} places`, 'danger', `${d.position}e / ${d.total}`],
        [
          `Recherches « ${d.metier} ${d.ville} »`,
          '30 derniers jours',
          'neutre',
          String(d.recherches30j),
        ],
      ]),
      para(
        `Les fiches Visibilité et Premium passent devant les fiches gratuites. Reprenez votre place pour ${visMois} par mois.`,
      ),
      bouton('Remonter en tête', d.lien),
      note('Nous ne communiquons jamais le nom des autres artisans.'),
    ],
    exemple: { ...EX_BASE, misesEnAvant: 3, position: 17, total: 23, recul: 3, recherches30j: 146 },
  }),
  'vis-recherches-manquees': modele<Recherches>({
    sujet: (d) => `${d.recherches7j} recherches de ${d.metier} sans vous en 1re page`.slice(0, 59),
    preheader: (d) => `Cette semaine à ${d.ville}, votre fiche n’apparaissait pas en premier.`,
    blocs: (d) => [
      titre('Des particuliers vous cherchent, sans vous trouver'),
      stats([[String(d.recherches7j), '7 jours', `Recherches « ${d.metier} ${d.ville} »`]]),
      para(
        'Votre fiche n’était pas en première page de ces recherches. Avec Visibilité, elle passe en tête de votre secteur.',
      ),
      offreVisibilite,
      bouton('Passer en tête de mon secteur', d.lien),
    ],
    exemple: { ...EX_BASE, recherches7j: 14 },
  }),
  'vis-offre-lancement': modele<Offre>({
    sujet: (d) =>
      `${d.prenom ? `${d.prenom}, ` : ''}−${d.pourcentage} % sur votre Visibilité`.slice(0, 59),
    sujetB: (d) => `Votre code −${d.pourcentage} % valable jusqu’au ${d.expire}`.slice(0, 59),
    preheader: (d) =>
      `Code personnel : ${ht(remise(PRIX.visibiliteAn, d.pourcentage))} pour toute l’année.`,
    blocs: (d) => [
      surtitre('Offre de bienvenue'),
      titre(`−${d.pourcentage} % sur votre première année de Visibilité`),
      ...offreRemisee(d),
      bouton(`Activer ma Visibilité à −${d.pourcentage} %`, d.lien),
      note(
        'Remise appliquée à la première année. Renouvellement au tarif normal, avec un rappel 7 jours avant.',
      ),
    ],
    exemple: EX_OFFRE,
  }),
  'vis-offre-rappel': modele<Offre>({
    sujet: (d) => `Votre code −${d.pourcentage} % expire ce soir`,
    preheader: (d) =>
      `${ht(remise(PRIX.visibiliteAn, d.pourcentage))} au lieu de ${ht(PRIX.visibiliteAn)} pour l’année.`,
    blocs: (d) => [
      titre('Dernier jour pour votre remise'),
      para(
        `${bonjour(d.prenom)}votre code personnel expire ce soir. Après, la Visibilité repasse au tarif normal.`,
      ),
      ...offreRemisee(d),
      bouton(`Activer à −${d.pourcentage} %`, d.lien),
    ],
    exemple: { ...EX_OFFRE, expire: 'ce soir à 23 h 59' },
  }),
  'vis-offre-relance': modele<Offre>({
    sujet: (d) =>
      `Une nouvelle remise de ${d.pourcentage} % pour ${d.nomCommercial ?? 'vous'}`.slice(0, 59),
    preheader: () => 'Votre fiche est en ligne depuis 3 mois : voici une nouvelle offre.',
    blocs: (d) => [
      titre('Passez en tête de votre secteur'),
      para(
        `${bonjour(d.prenom)}votre fiche est en ligne depuis 3 mois. Pour vous aider à passer le cap, voici un code personnel.`,
      ),
      ...offreRemisee(d),
      bouton('Activer ma Visibilité', d.lien),
    ],
    exemple: { ...EX_OFFRE, expire: 'mardi 15 décembre à 23 h 59' },
  }),
  'vis-demande-offerte': modele<DemandeZone>({
    sujet: (d) => `Cette demande de ${formatEuros(d.budgetMaxCentimes)} est à vous`.slice(0, 59),
    preheader: (d) =>
      `${d.travaux} à ${d.ville}, ${d.distanceKm} km. Offerte avec Visibilité.`.slice(0, 120),
    blocs: (d) => [
      surtitre('Demande offerte'),
      titre('Une demande vous attend, gratuitement'),
      recap([
        ['Travaux', d.travaux],
        ['Budget estimé', fourchette(d.budgetMinCentimes, d.budgetMaxCentimes), true],
        ['Commune', `${d.ville} · ${d.distanceKm} km de votre siège`],
        ['Délai souhaité', d.delai],
      ]),
      alerte(
        'Activez Visibilité aujourd’hui : cette demande est débloquée immédiatement, sans frais. Seuls les 3 premiers artisans la reçoivent.',
      ),
      offreVisibilite,
      bouton('Activer Visibilité et recevoir la demande', d.lien),
      note(
        'Offre valable une seule fois par entreprise. Les coordonnées du particulier s’affichent après l’activation.',
      ),
    ],
    exemple: {
      ...EX_DEMANDE,
      metier: 'chauffagiste',
      ville: 'Talence',
      travaux: 'Chaudière gaz → pompe à chaleur air-eau',
      budgetMinCentimes: 720_000,
      budgetMaxCentimes: 960_000,
      distanceKm: 9,
      delai: 'Sous 1 mois',
    },
  }),
};
