import { bouton, note, para, recap, titre } from '../blocs';
import { bonjour, modele } from '../modele';

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
};
