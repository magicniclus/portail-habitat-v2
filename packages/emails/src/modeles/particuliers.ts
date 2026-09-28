import { arrondiAffichage } from '@ph/core/simulateur';
import { formatFourchette } from '@ph/core/format';
import { bouton, note, para, recap, titre } from '../blocs';
import { bonjour, modele } from '../modele';

interface DemandeConfirmee {
  prenom?: string;
  reference: string;
  prestation: string;
  ville: string;
  minCentimes: number;
  maxCentimes: number;
  miseEnRelation: boolean;
  /** Compte créé par la demande : le lien connecte directement (lien magique). */
  nouveauCompte: boolean;
  lien: string;
}

/** EMAILS §4.4 : seule la reprise du simulateur est rédigée au lot 5 ; les autres au lot 8. */
export const modelesParticuliers = {
  'reprise-simulateur': modele<{ prenom?: string; resume: string; etape: number; lien: string }>({
    sujet: () => 'Reprenez votre estimation où vous l’avez laissée',
    preheader: (d) => `${d.resume} · étape ${d.etape} sur 5.`,
    blocs: (d) => [
      titre('Reprenez votre estimation'),
      para(
        `${bonjour(d.prenom)}votre projet est enregistré. Ce lien vous ramène à l’étape où vous vous êtes arrêté, sur n’importe quel appareil.`,
      ),
      recap([
        ['Projet', d.resume, true],
        ['Étape', `${d.etape} sur 5`],
      ]),
      bouton(`Reprendre à l’étape ${d.etape}`, d.lien),
      note(
        'Lien valable 30 jours, utilisable une seule fois. Vous avez demandé ce lien en cochant « M’envoyer un lien pour reprendre plus tard ».',
      ),
    ],
    exemple: {
      prenom: 'Camille',
      resume: 'Salle de bain · 6 m² · douche à l’italienne',
      etape: 3,
      lien: 'https://portailhabitat.fr/simulateur?reprise=exemple',
    },
  }),

  /** EMAILS §4.4 et COMPTES §2 : récapitulatif, estimation, référence, lien de suivi. */
  'demande-confirmee': modele<DemandeConfirmee>({
    sujet: (d) => `Votre demande ${d.reference} est enregistrée`,
    preheader: (d) =>
      `${d.prestation} à ${d.ville} : ${formatFourchette(arrondiAffichage(d.minCentimes), arrondiAffichage(d.maxCentimes))}.`,
    blocs: (d) => [
      titre(`Votre demande ${d.reference}`),
      para(
        `${bonjour(d.prenom)}voici l’estimation de votre projet. ${
          d.miseEnRelation
            ? 'Jusqu’à 3 artisans vérifiés de votre secteur vont vous répondre sous 48 h.'
            : 'Vous n’avez pas demandé de mise en relation : aucun artisan ne reçoit vos coordonnées.'
        }`,
      ),
      recap([
        ['Projet', d.prestation, true],
        ['Commune', d.ville],
        [
          'Estimation',
          formatFourchette(arrondiAffichage(d.minCentimes), arrondiAffichage(d.maxCentimes)),
          true,
        ],
        ['Référence', d.reference],
      ]),
      bouton('Suivre ma demande', d.lien),
      note(
        d.nouveauCompte
          ? 'Ce bouton vous connecte à votre espace, sans mot de passe. Il est personnel : ne le transférez pas.'
          : 'Connectez-vous avec l’adresse de ce message pour retrouver votre demande.',
      ),
      note('Estimation indicative : seule la visite de l’artisan fait foi.'),
    ],
    exemple: {
      prenom: 'Camille',
      reference: 'PH-7K2Q9M',
      prestation: 'Salle de bain',
      ville: 'Bordeaux',
      minCentimes: 812_000,
      maxCentimes: 1_164_000,
      miseEnRelation: true,
      nouveauCompte: true,
      lien: 'https://portailhabitat.fr/connexion/lien?suite=%2Fmon-espace%2Fdemandes%2Fexemple',
    },
  }),
};
