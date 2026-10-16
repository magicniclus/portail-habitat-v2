import { alerte, bouton, note, para, titre } from '../blocs';
import { modele } from '../modele';

/** DOMAINES §7 : domaine personnel du site (charte pro, transactionnel). */
interface Domaine {
  nomCommercial: string;
  domaine: string;
  /** Enregistrements encore manquants (« TXT _portailhabitat »). */
  manquants: string[];
  lien: string;
}

const EX: Domaine = {
  nomCommercial: 'Bertrand Rénovation',
  domaine: 'bertrand-renovation.fr',
  manquants: ['TXT _portailhabitat'],
  lien: 'https://portailhabitat.fr/pro/site?onglet=domaine',
};

export const modelesSites = {
  'site-domaine-actif': modele<Domaine>({
    sujet: (d) => `Votre site est en ligne sur ${d.domaine}`.slice(0, 59),
    preheader: () => 'Adresse vérifiée, certificat HTTPS en place.',
    blocs: (d) => [
      titre('Votre domaine est actif'),
      para(
        `Le site de ${d.nomCommercial} répond maintenant sur ${d.domaine}, en HTTPS. Votre adresse gratuite redirige automatiquement vers ce domaine.`,
      ),
      bouton('Voir mon site', `https://www.${d.domaine}`),
      note('Vos emails ne sont pas concernés : nous ne modifions jamais vos enregistrements MX.'),
    ],
    exemple: EX,
  }),
  'site-domaine-echec': modele<Domaine>({
    sujet: (d) => `${d.domaine} : vérification impossible`.slice(0, 59),
    preheader: () => 'Il manque des enregistrements chez votre hébergeur de domaine.',
    blocs: (d) => [
      titre('Votre domaine n’a pas pu être vérifié'),
      para(
        `Après 72 heures, nous ne trouvons pas tous les enregistrements demandés pour ${d.domaine}. Votre site reste en ligne sur son adresse gratuite.`,
      ),
      alerte(
        `Encore à créer ou à corriger : ${d.manquants.length ? d.manquants.join(', ') : 'voir le tableau dans votre espace'}.`,
      ),
      bouton('Voir les enregistrements', d.lien),
      note('Une fois les enregistrements ajoutés, cliquez sur « Vérifier maintenant ».'),
    ],
    exemple: EX,
  }),
  'site-domaine-casse': modele<Domaine>({
    sujet: (d) => `${d.domaine} ne mène plus à votre site`.slice(0, 59),
    preheader: () => 'Votre site reste en ligne sur son adresse gratuite.',
    blocs: (d) => [
      titre('Votre domaine ne pointe plus vers votre site'),
      para(
        `Depuis 3 jours, les enregistrements de ${d.domaine} ne mènent plus au site de ${d.nomCommercial}. Pour que vos visiteurs le trouvent toujours, il reste en ligne sur son adresse gratuite.`,
      ),
      alerte(
        `À corriger chez votre hébergeur de domaine : ${d.manquants.length ? d.manquants.join(', ') : 'voir le tableau dans votre espace'}.`,
      ),
      bouton('Voir les enregistrements', d.lien),
      note('Dès que les enregistrements sont corrects, le domaine est réactivé automatiquement.'),
    ],
    exemple: EX,
  }),
};
