import { alerte, bouton, note, para, recap, titre } from '../blocs';
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
  'site-domaine-attente': modele<
    Domaine & { lignes: { type: string; nom: string; valeur: string }[] }
  >({
    sujet: (d) => `${d.domaine} : il reste une étape`.slice(0, 59),
    preheader: () => 'Les enregistrements DNS ne sont pas encore en place.',
    blocs: (d) => [
      titre('Votre domaine attend ses enregistrements'),
      para(
        `Depuis 24 heures, nous ne trouvons pas encore tous les enregistrements de ${d.domaine}. Ajoutez-les chez votre hébergeur de domaine (OVH, Gandi, IONOS…) : la vérification reprend toute seule.`,
      ),
      recap(d.lignes.map((l) => [`${l.type} ${l.nom}`, l.valeur])),
      bouton('Voir les enregistrements', d.lien),
      note(
        'Votre site reste en ligne sur son adresse gratuite en attendant. Vos emails (MX) ne sont pas concernés.',
      ),
    ],
    exemple: {
      ...EX,
      lignes: [
        { type: 'A', nom: '@', valeur: '76.76.21.21' },
        { type: 'CNAME', nom: 'www', valeur: 'cname.vercel-dns.com' },
        { type: 'TXT', nom: '_portailhabitat', valeur: 'ph-verif=…' },
      ],
    },
  }),
  'site-domaine-renouvele': modele<{
    nomCommercial: string;
    domaine: string;
    le: string;
    lien: string;
  }>({
    sujet: (d) => `${d.domaine} sera renouvelé le ${d.le}`.slice(0, 59),
    preheader: () => 'Rien à faire : le renouvellement est inclus dans Site Pro.',
    blocs: (d) => [
      titre('Renouvellement de votre domaine'),
      para(
        `Le domaine ${d.domaine} de ${d.nomCommercial} sera renouvelé automatiquement le ${d.le}. Il reste enregistré à votre nom.`,
      ),
      bouton('Voir mon domaine', d.lien),
      note('Pour garder le domaine sans Site Pro, demandez son transfert depuis l’onglet Domaine.'),
    ],
    exemple: { ...EX, le: '14 novembre 2026' },
  }),
  'site-domaine-transfert': modele<{
    nomCommercial: string;
    domaine: string;
    authCode: string;
    lien: string;
  }>({
    sujet: (d) => `${d.domaine} : votre code de transfert`.slice(0, 59),
    preheader: () => 'Le domaine est à votre nom : vous pouvez le garder.',
    blocs: (d) => [
      titre('Votre domaine vous appartient'),
      para(
        `Site Pro est résilié. Le domaine ${d.domaine} est enregistré au nom de ${d.nomCommercial} : pour le garder, transférez-le chez le bureau d’enregistrement de votre choix avec ce code.`,
      ),
      recap([['Code de transfert (AuthCode)', d.authCode, true]]),
      alerte('Ne communiquez ce code qu’au bureau d’enregistrement qui reçoit le domaine.', 'warn'),
      bouton('Voir mon domaine', d.lien),
    ],
    exemple: { ...EX, authCode: 'X7#k-29Qp' },
  }),
};
