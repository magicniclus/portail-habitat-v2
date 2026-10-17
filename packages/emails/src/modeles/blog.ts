import { alerte, bouton, note, para, recap, titre } from '../blocs';
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

/** Pilote du blog (D70) : article prêt, publié seulement si l'artisan clique (BLOG-12). */
interface ArticleAValider {
  nomCommercial: string;
  titre: string;
  /** Date de publication prévue (« 21 octobre 2026 »). */
  date: string;
  /** Points bloquants restants : la validation est refusée tant qu'ils ne sont pas corrigés. */
  aCorriger: string[];
  lienRelire: string;
  /** Lien personnel (secret) vers la page « Valider la publication ». */
  lienValider: string;
}

export const modelesBlog = {
  'blog-a-valider': modele<ArticleAValider>({
    sujet: (d) => `Article prêt : à valider avant le ${d.date}`.slice(0, 59),
    preheader: (d) => `« ${d.titre} » ne sera publié qu’après votre accord.`.slice(0, 120),
    blocs: (d) => [
      titre('Un nouvel article attend votre accord'),
      para(
        `Le pilote automatique du blog de ${d.nomCommercial} a rédigé un article. Relisez-le, puis validez-le : il sera publié le ${d.date}.`,
      ),
      recap([
        ['Article', d.titre, true],
        ['Publication prévue', d.date],
      ]),
      ...(d.aCorriger.length
        ? [alerte(`À corriger avant de valider : ${d.aCorriger.join(', ').toLowerCase()}.`, 'warn')]
        : []),
      bouton('Relire et valider', d.lienValider),
      para(`Vous préférez le modifier ? Ouvrez-le dans votre espace : ${d.lienRelire}`),
      note(
        'Sans votre clic, l’article reste un brouillon et n’est jamais publié. Ce lien est personnel : ne le transférez pas.',
      ),
    ],
    exemple: {
      nomCommercial: 'Bertrand Rénovation',
      titre: 'Pompe à chaleur : 5 questions avant de se lancer',
      date: '21 octobre 2026',
      aCorriger: [],
      lienRelire: 'https://portailhabitat.fr/pro/site/blog/a1',
      lienValider: 'https://portailhabitat.fr/pro/blog-valider/a1.b2.jeton',
    },
  }),
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
