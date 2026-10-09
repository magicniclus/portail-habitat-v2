import { alerte, bouton, etapes, note, para, recap, sousTitre, titre, type Bloc } from '../blocs';
import { bonjour, modele } from '../modele';

/** EMAILS §4.2 : inscription et onboarding artisan (charte orange). */
interface Base {
  prenom?: string;
  nomCommercial: string;
  lien: string;
}
interface Relance extends Base {
  pourcent: number;
  etapesFaites: number;
  /** Nombre de demandes du mois dans son métier et sa zone (STATS_DEMANDES). */
  demandesZone?: number;
  metier?: string;
  ville?: string;
}
interface Document extends Base {
  document: string;
  deposeLe: string;
  motif?: string;
}
const EX: Base = {
  prenom: 'Julien',
  nomCommercial: 'Bertrand Rénovation',
  lien: 'https://portailhabitat.fr/pro/inscription?reprise=exemple',
};
const EX_RELANCE: Relance = {
  ...EX,
  pourcent: 66,
  etapesFaites: 2,
  demandesZone: 38,
  metier: 'plombier',
  ville: 'Bordeaux',
};
const EX_DOC: Document = {
  ...EX,
  document: 'Attestation décennale',
  deposeLe: '24 septembre 2026',
  motif: 'Attestation expirée le 31/12/2025',
};

const ETAPES_INSCRIPTION = ['Entreprise', 'Zone et métiers', 'Création du compte'];
const avancement = (d: Relance): Bloc[] => [
  { type: 'progression', libelle: 'Inscription', pourcent: d.pourcent },
  etapes(ETAPES_INSCRIPTION.map((e, i) => [e, i < d.etapesFaites])),
];
const zone = (d: Relance): Bloc[] =>
  d.demandesZone && d.metier && d.ville
    ? [
        alerte(
          `Ce mois-ci, ${d.demandesZone} particuliers ont cherché un ${d.metier} autour de ${d.ville}.`,
        ),
      ]
    : [];

export const modelesOnboarding = {
  'reprise-onboarding': modele<Base>({
    sujet: () => 'Reprenez votre inscription où vous l’avez laissée',
    preheader: (d) => `Inscription de ${d.nomCommercial} : vos informations sont enregistrées.`,
    blocs: (d) => [
      titre('Reprenez votre inscription'),
      para(
        `${bonjour(d.prenom)}vos informations sont enregistrées. Ce lien vous permet de terminer sur n’importe quel appareil.`,
      ),
      bouton('Reprendre mon inscription', d.lien),
      note('Lien valable 30 jours.'),
    ],
    exemple: EX,
  }),
  'relance-onboarding-1': modele<Relance>({
    sujet: () => 'Il vous reste 2 minutes pour recevoir vos demandes',
    preheader: (d) => `Votre inscription ${d.nomCommercial} est enregistrée à ${d.pourcent} %.`,
    blocs: (d) => [
      titre('Votre inscription est presque terminée'),
      para(
        `${bonjour(d.prenom)}vous avez commencé à inscrire ${d.nomCommercial}. Reprenez exactement où vous en étiez.`,
      ),
      ...avancement(d),
      bouton('Terminer mon inscription', d.lien),
      ...zone(d),
    ],
    exemple: EX_RELANCE,
  }),
  'relance-onboarding-2': modele<Relance>({
    sujet: (d) => `${d.demandesZone ?? 'Des'} demandes dans votre zone ce mois-ci`,
    preheader: () => 'Terminez votre inscription pour les recevoir.',
    blocs: (d) => [
      titre('Des particuliers cherchent un artisan près de chez vous'),
      ...zone(d),
      para(
        'Terminez votre inscription : votre fiche peut être en ligne dès aujourd’hui, gratuitement.',
      ),
      bouton('Terminer mon inscription', d.lien),
      note('Chiffre estimé à partir des demandes déposées dans votre département.'),
    ],
    exemple: EX_RELANCE,
  }),
  'relance-onboarding-3': modele<Relance>({
    sujet: () => 'Dernier rappel : votre inscription vous attend',
    preheader: () => 'Après cet email, nous ne vous relancerons plus.',
    blocs: (d) => [
      titre('Dernier rappel'),
      para(
        `${bonjour(d.prenom)}l’inscription de ${d.nomCommercial} est enregistrée à ${d.pourcent} %. C’est notre dernière relance.`,
      ),
      bouton('Terminer mon inscription', d.lien),
      note('Sans action de votre part, vos informations seront supprimées dans 20 jours.'),
    ],
    exemple: EX_RELANCE,
  }),
  'bienvenue-pro': modele<Base>({
    sujet: (d) => `Bienvenue sur Portail Habitat Pro${d.prenom ? `, ${d.prenom}` : ''}`,
    preheader: () => '3 étapes pour que votre fiche soit en ligne et que les demandes arrivent.',
    blocs: (d) => [
      titre(`Bienvenue, ${d.nomCommercial}`),
      para(
        'Votre compte est créé. Pour apparaître dans l’annuaire et recevoir des demandes, il reste 3 étapes rapides.',
      ),
      etapes([
        ['Créer votre compte', true],
        ['Vérifier votre numéro de mobile', false],
        ['Déposer votre attestation décennale', false],
        ['Compléter votre fiche à 60 % (logo, photos, description)', false],
      ]),
      bouton('Accéder à mon espace', d.lien),
      note(
        'Une question ? Répondez simplement à cet email, notre équipe vous répond sous 24 h ouvrées.',
      ),
    ],
    exemple: { ...EX, lien: 'https://portailhabitat.fr/pro' },
  }),
  'verifier-telephone': modele<{ code: string }>({
    sujet: () => 'Votre code de vérification',
    preheader: (d) => `Code : ${d.code}. Valable 10 minutes.`,
    blocs: (d) => [
      titre('Votre code de vérification'),
      { type: 'code', texte: d.code },
      note(
        'Valable 10 minutes. Ne le communiquez à personne : Portail Habitat ne vous le demandera jamais.',
      ),
    ],
    sms: (d) =>
      `Portail Habitat : votre code est ${d.code}. Valable 10 min. Ne le communiquez à personne.`,
    exemple: { code: '482913' },
  }),
  'fiche-incomplete': modele<Base & { completude: number; manques: string[] }>({
    sujet: (d) => `Votre fiche est complète à ${d.completude} %`,
    preheader: () => 'À partir de 60 %, votre fiche apparaît dans l’annuaire.',
    blocs: (d) => [
      titre('Complétez votre fiche'),
      { type: 'progression', libelle: 'Fiche', pourcent: d.completude },
      etapes(d.manques.map((m) => [m, false])),
      bouton('Compléter ma fiche', d.lien),
    ],
    exemple: {
      ...EX,
      completude: 40,
      manques: [
        'Ajouter votre logo',
        'Ajouter 3 photos de réalisations',
        'Rédiger votre présentation',
      ],
    },
  }),
  'document-recu': modele<Document>({
    sujet: (d) => `${d.document} bien reçue`,
    preheader: () => 'Vérification sous 48 h ouvrées.',
    blocs: (d) => [
      titre('Document bien reçu'),
      recap([
        ['Document', d.document],
        ['Déposé le', d.deposeLe],
      ]),
      para('Notre équipe le vérifie sous 48 h ouvrées. Vous recevrez un email dès la décision.'),
      bouton('Voir mes documents', d.lien),
    ],
    exemple: EX_DOC,
  }),
  'document-valide': modele<Document>({
    sujet: (d) => `${d.document} validée`,
    preheader: () => 'Votre document est vérifié.',
    blocs: (d) => [
      titre('Document validé'),
      recap([
        ['Document', d.document],
        ['Déposé le', d.deposeLe],
      ]),
      alerte('Le label correspondant apparaît sur votre fiche publique.', 'ok'),
      bouton('Voir ma fiche', d.lien),
    ],
    exemple: EX_DOC,
  }),
  'document-refuse': modele<Document>({
    sujet: (d) => `${d.document} : document non validé`,
    preheader: (d) => `Motif : ${d.motif ?? 'non précisé'}. Déposez un nouveau document.`,
    blocs: (d) => [
      titre('Nous n’avons pas pu valider votre document'),
      recap([
        ['Document', d.document],
        ['Déposé le', d.deposeLe],
        ['Motif', d.motif ?? 'Non précisé', true],
      ]),
      para('Votre fiche reste hors ligne tant qu’un document valide n’est pas déposé.'),
      bouton('Déposer un nouveau document', d.lien),
      note('Vérification sous 48 h ouvrées après le dépôt.'),
    ],
    exemple: EX_DOC,
  }),
  'fiche-en-ligne': modele<Base & { initiales: string; meta: string; labels: string }>({
    sujet: () => 'Votre fiche est en ligne',
    preheader: (d) => `${d.nomCommercial} apparaît désormais dans l’annuaire de Portail Habitat.`,
    blocs: (d) => [
      titre('Votre fiche est en ligne'),
      para(
        `Félicitations : ${d.nomCommercial} est visible par les particuliers de votre zone et peut recevoir des demandes.`,
      ),
      {
        type: 'carteArtisan',
        initiales: d.initiales,
        nom: d.nomCommercial,
        meta: d.meta,
        labels: d.labels,
      },
      bouton('Voir ma fiche publique', d.lien),
      sousTitre('Pour recevoir plus de demandes'),
      etapes([
        ['Ajoutez 3 photos de réalisations', false],
        ['Répondez aux demandes en moins de 2 h pour obtenir le label « Réponse rapide »', false],
      ]),
    ],
    exemple: {
      ...EX,
      initiales: 'BR',
      meta: 'Nouveau · Bordeaux et 25 km',
      labels: 'Vérifié · Décennale',
    },
  }),
  'revendication-code': modele<Base & { code: string }>({
    sujet: () => 'Votre code pour revendiquer votre fiche',
    preheader: (d) => `Fiche ${d.nomCommercial} : saisissez ce code pour la gérer.`,
    blocs: (d) => [
      titre('Revendiquez votre fiche'),
      para(`Saisissez ce code pour prendre la main sur la fiche ${d.nomCommercial}.`),
      { type: 'code', texte: d.code },
      bouton('Saisir mon code', d.lien),
      note('Code valable 30 jours, à usage unique.'),
    ],
    exemple: { ...EX, code: 'K7Q2M9' },
  }),
  'revendication-resultat': modele<Base & { acceptee: boolean; motif?: string }>({
    sujet: (d) => (d.acceptee ? 'Votre fiche vous appartient' : 'Revendication non acceptée'),
    preheader: (d) =>
      d.acceptee
        ? `Vous gérez désormais ${d.nomCommercial}.`
        : `Motif : ${d.motif ?? 'non précisé'}`,
    blocs: (d) =>
      d.acceptee
        ? [
            titre('Revendication acceptée'),
            para(
              `Vous gérez désormais la fiche ${d.nomCommercial}. Les avis et statistiques sont conservés.`,
            ),
            bouton('Accéder à mon espace', d.lien),
          ]
        : [
            titre('Revendication non acceptée'),
            recap([['Motif', d.motif ?? 'Non précisé', true]]),
            bouton('Contacter le support', d.lien),
          ],
    exemple: { ...EX, acceptee: true },
  }),
  'entreprise-existe-deja': modele<Base>({
    sujet: () => 'Quelqu’un a tenté d’inscrire votre entreprise',
    preheader: (d) =>
      `Une inscription de ${d.nomCommercial} a été tentée. C’était un membre de votre équipe ?`,
    blocs: (d) => [
      titre('Tentative d’inscription de votre entreprise'),
      para(
        `Quelqu’un a essayé d’inscrire ${d.nomCommercial}, qui a déjà un compte. Il peut vous demander à rejoindre l’équipe.`,
      ),
      alerte(
        'Si vous ne reconnaissez pas cette démarche, aucune action n’est nécessaire : personne n’a accès à votre compte.',
      ),
      bouton('Gérer mon équipe', d.lien),
    ],
    exemple: EX,
  }),
};
