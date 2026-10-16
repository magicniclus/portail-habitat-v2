import { bouton, note, para, titre } from '../blocs';
import { modele } from '../modele';

/** BLOG §2 : quota mensuel des articles rédigés par l'IA atteint (charte pro, activité). */
interface QuotaBlog {
  nomCommercial: string;
  max: number;
  /** Date de remise à zéro (« 1er novembre »). */
  remise: string;
  /** Site Pro : lien vers l'offre Tout inclus (15 articles par mois). */
  lienOffre?: string;
  lien: string;
}

export const modelesBlog = {
  'blog-quota-atteint': modele<QuotaBlog>({
    sujet: (d) => `Vos ${d.max} articles du mois sont rédigés`.slice(0, 59),
    preheader: (d) => `Nouveaux articles par l’IA dès le ${d.remise}.`,
    blocs: (d) => [
      titre('Quota d’articles du mois atteint'),
      para(
        `L’IA a rédigé les ${d.max} articles inclus ce mois-ci pour ${d.nomCommercial}. Le compteur repart à zéro le ${d.remise}.`,
      ),
      para(
        'Vous pouvez toujours écrire vous-même ; titres, descriptions et tags restent disponibles avec l’IA.',
      ),
      ...(d.lienOffre
        ? [bouton('Tout inclus : 15 articles par mois', d.lienOffre)]
        : [bouton('Ouvrir mon blog', d.lien)]),
      note('Vous recevez cet email car vous utilisez le blog de votre site Portail Habitat.'),
    ],
    exemple: {
      nomCommercial: 'Bertrand Rénovation',
      max: 5,
      remise: '1er novembre',
      lienOffre: 'https://portailhabitat.fr/pro/abonnement?offre=tout',
      lien: 'https://portailhabitat.fr/pro/site?onglet=blog',
    },
  }),
};
